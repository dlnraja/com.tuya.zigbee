#!/usr/bin/env node

/**
 * 📊 MISE À JOUR DES STATISTIQUES DU README
 * 
 * Lit docs/data/*.json et met à jour le bloc KPI du README
 * 
 * Usage: DEBUG=1 node scripts/build/update_readme_stats.mjs
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEBUG = process.env.DEBUG === '1';
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

class ReadmeStatsUpdater {
  constructor() {
    this.dataPath = path.join(PROJECT_ROOT, 'docs', 'data');
    this.readmePath = path.join(PROJECT_ROOT, 'README.md');
    this.backupPath = path.join(PROJECT_ROOT, 'README.md.backup');
  }

  async run() {
    try {
      console.log('📊 MISE À JOUR DES STATISTIQUES DU README');
      console.log(`📁 Data: ${this.dataPath}`);
      console.log(`📄 README: ${this.readmePath}`);
      
      // 1. Vérifier que les données existent
      if (!(await fs.pathExists(this.dataPath))) {
        console.log('❌ Dossier docs/data/ non trouvé. Exécutez d\'abord export_dashboard_data.mjs');
        process.exit(1);
      }
      
      // 2. Charger les données
      const data = await this.loadData();
      
      // 3. Sauvegarder le README actuel
      await this.backupReadme();
      
      // 4. Mettre à jour le README
      await this.updateReadme(data);
      
      console.log('✅ MISE À JOUR TERMINÉE !');
      
    } catch (error) {
      console.error('❌ Erreur:', error);
      process.exit(1);
    }
  }

  async loadData() {
    console.log('\n📂 CHARGEMENT DES DONNÉES...');
    
    const data = {};
    
    try {
      // Charger summary.json (données principales)
      const summaryPath = path.join(this.dataPath, 'summary.json');
      if (await fs.pathExists(summaryPath)) {
        data.summary = await fs.readJson(summaryPath);
        if (DEBUG) console.log('  ✅ summary.json chargé');
      }
      
      // Charger kpi.json (données détaillées)
      const kpiPath = path.join(this.dataPath, 'kpi.json');
      if (await fs.pathExists(kpiPath)) {
        data.kpi = await fs.readJson(kpiPath);
        if (DEBUG) console.log('  ✅ kpi.json chargé');
      }
      
      // Charger categories.json
      const categoriesPath = path.join(this.dataPath, 'categories.json');
      if (await fs.pathExists(categoriesPath)) {
        data.categories = await fs.readJson(categoriesPath);
        if (DEBUG) console.log('  ✅ categories.json chargé');
      }
      
      // Charger vendors.json
      const vendorsPath = path.join(this.dataPath, 'vendors.json');
      if (await fs.pathExists(vendorsPath)) {
        data.vendors = await fs.readJson(vendorsPath);
        if (DEBUG) console.log('  ✅ vendors.json chargé');
      }
      
    } catch (error) {
      console.error('  ❌ Erreur lors du chargement des données:', error.message);
      throw error;
    }
    
    return data;
  }

  async backupReadme() {
    console.log('\n💾 SAUVEGARDE DU README...');
    
    if (await fs.pathExists(this.readmePath)) {
      await fs.copy(this.readmePath, this.backupPath);
      console.log('  ✅ README sauvegardé');
    } else {
      console.log('  ⚠️  README.md non trouvé, création d\'un nouveau');
    }
  }

  async updateReadme(data) {
    console.log('\n🔄 MISE À JOUR DU README...');
    
    let readmeContent = '';
    
    // Si le README existe, le lire
    if (await fs.pathExists(this.readmePath)) {
      readmeContent = await fs.readFile(this.readmePath, 'utf8');
    } else {
      // Créer un README de base
      readmeContent = this.createBaseReadme();
    }
    
    // Générer le contenu des statistiques
    const statsContent = this.generateStatsContent(data);
    
    // Mettre à jour ou insérer les statistiques
    const updatedContent = this.insertStatsInReadme(readmeContent, statsContent);
    
    // Écrire le nouveau contenu
    await fs.writeFile(this.readmePath, updatedContent, 'utf8');
    console.log('  ✅ README mis à jour');
  }

  createBaseReadme() {
    return `# Universal Tuya Zigbee

Universal Tuya Zigbee integration for Homey with comprehensive device support.

<!-- KPI-START -->
<!-- Les statistiques seront insérées ici automatiquement -->
<!-- KPI-END -->

## Features

- Comprehensive Tuya Zigbee device support
- Homey SDK3+ compatible
- Multi-language support
- Automated driver generation

## Installation

\`\`\`bash
npm install
npm run validate
\`\`\`

## Development

\`\`\`bash
npm run mega
npm run build:drivers
npm run export:dashboard
\`\`\`

## License

MIT
`;
  }

  generateStatsContent(data) {
    const summary = data.summary || {};
    const kpi = data.kpi || {};
    
    const totalDrivers = summary.total?.drivers || 0;
    const totalCatalog = summary.total?.catalogProducts || 0;
    const totalCategories = summary.total?.categories || 0;
    const totalVendors = summary.total?.vendors || 0;
    const compliancePercentage = summary.compliance?.percentage || 0;
    
    const topCategories = summary.topCategories || [];
    const topVendors = summary.topVendors || [];
    
    return `## 📊 Project Statistics

### **Overall Status**
- 🚀 **Total Drivers**: ${totalDrivers.toLocaleString()}
- 📦 **Catalog Products**: ${totalCatalog.toLocaleString()}
- 📁 **Categories**: ${totalCategories}
- 🏭 **Vendors**: ${totalVendors}
- ✅ **SDK3 Compliance**: ${compliancePercentage}%

### **Top Categories**
${topCategories.map((cat, index) => `${index + 1}. **${cat.name}**: ${cat.count} devices`).join('\n')}

### **Top Vendors**
${topVendors.map((vendor, index) => `${index + 1}. **${vendor.name}**: ${vendor.count} devices`).join('\n')}

### **Compliance Status**
- 🟢 **SDK3 Ready**: ${summary.compliance?.sdk3Ready || 0} drivers
- 🟡 **Needs Update**: ${summary.compliance?.sdk3NotReady || 0} drivers
- 📊 **Overall**: ${compliancePercentage}% compliant

---

*Last updated: ${new Date().toLocaleString('fr-FR')}*
*Data source: Automated export from project catalog and drivers*`;
  }

  insertStatsInReadme(readmeContent, statsContent) {
    const kpiStartMarker = '<!-- KPI-START -->';
    const kpiEndMarker = '<!-- KPI-END -->';
    
    const startIndex = readmeContent.indexOf(kpiStartMarker);
    const endIndex = readmeContent.indexOf(kpiEndMarker);
    
    if (startIndex === -1 || endIndex === -1) {
      // Marqueurs non trouvés, ajouter à la fin
      console.log('  ⚠️  Marqueurs KPI non trouvés, ajout à la fin');
      return readmeContent + '\n\n' + statsContent;
    }
    
    if (startIndex >= endIndex) {
      // Marqueurs dans le mauvais ordre
      console.log('  ⚠️  Marqueurs KPI dans le mauvais ordre, correction...');
      return this.fixKpiMarkers(readmeContent, statsContent);
    }
    
    // Remplacer le contenu entre les marqueurs
    const beforeKpi = readmeContent.substring(0, startIndex + kpiStartMarker.length);
    const afterKpi = readmeContent.substring(endIndex);
    
    return beforeKpi + '\n' + statsContent + '\n' + afterKpi;
  }

  fixKpiMarkers(readmeContent, statsContent) {
    // Supprimer les anciens marqueurs et ajouter les nouveaux
    const cleanedContent = readmeContent
      .replace(/<!-- KPI-START -->[\s\S]*?<!-- KPI-END -->/g, '')
      .replace(/<!-- KPI-START -->/g, '')
      .replace(/<!-- KPI-END -->/g, '');
    
    return cleanedContent + '\n\n' + statsContent;
  }
}

// Exécuter le mise à jour
const updater = new ReadmeStatsUpdater();
updater.run().catch(console.error);
