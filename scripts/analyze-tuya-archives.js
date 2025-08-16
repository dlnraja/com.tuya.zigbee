#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

console.log('🔍 ANALYSE COMPLÈTE DES ARCHIVES TUYA v3.4.1 Starting...');

const fs = require('fs-extra');
const path = require('path');

class TuyaArchivesAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.tmpDir = path.join(this.projectRoot, '.tmp_tuya_zip_work');
    this.backupDir = path.join(this.projectRoot, '.backup', 'zips');
    this.reportsDir = path.join(this.projectRoot, 'reports');
    this.analysisResults = {
      archivesFound: [],
      driversExtracted: [],
      clustersFound: [],
      capabilitiesFound: [],
      dataPointsFound: [],
      improvements: [],
      missingDrivers: [],
      automationIdeas: []
    };
  }

  log(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
  }

  async ensureDirectoryExists(dirPath) {
    if (!await fs.pathExists(dirPath)) {
      await fs.mkdirp(dirPath);
      this.log(`📁 Dossier créé: ${dirPath}`);
    }
  }

  async scanArchives() {
    this.log('🔍 SCAN DES ARCHIVES TUYA...');
    
    // Scan des archives dans .tmp_tuya_zip_work
    if (await fs.pathExists(this.tmpDir)) {
      const tmpItems = await fs.readdir(this.tmpDir);
      for (const item of tmpItems) {
        const itemPath = path.join(this.tmpDir, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          this.analysisResults.archivesFound.push({
            name: item,
            path: itemPath,
            type: 'extracted',
            size: await this.getDirectorySize(itemPath)
          });
        }
      }
    }

    // Scan des archives dans .backup/zips
    if (await fs.pathExists(this.backupDir)) {
      const backupItems = await fs.readdir(this.backupDir);
      for (const item of backupItems) {
        if (item.toLowerCase().endsWith('.zip')) {
          const itemPath = path.join(this.backupDir, item);
          const stats = await fs.stat(itemPath);
          
          this.analysisResults.archivesFound.push({
            name: item,
            path: itemPath,
            type: 'compressed',
            size: stats.size
          });
        }
      }
    }

    this.log(`📦 Archives trouvées: ${this.analysisResults.archivesFound.length}`);
  }

  async getDirectorySize(dirPath) {
    let totalSize = 0;
    try {
      const items = await fs.readdir(dirPath);
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          totalSize += await this.getDirectorySize(itemPath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch (error) {
      this.log(`⚠️ Erreur lors du calcul de la taille: ${error.message}`);
    }
    return totalSize;
  }

  async analyzeExtractedArchives() {
    this.log('🔍 ANALYSE DES ARCHIVES EXTRACTÉES...');
    
    for (const archive of this.analysisResults.archivesFound) {
      if (archive.type === 'extracted') {
        this.log(`📂 Analyse de: ${archive.name}`);
        await this.analyzeArchiveContent(archive);
      }
    }
  }

  async analyzeArchiveContent(archive) {
    try {
      const archivePath = archive.path;
      const items = await fs.readdir(archivePath);
      
      for (const item of items) {
        const itemPath = path.join(archivePath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          await this.analyzeDriverDirectory(itemPath, item);
        } else if (item.toLowerCase().endsWith('.js')) {
          await this.analyzeJavaScriptFile(itemPath, item);
        } else if (item.toLowerCase().endsWith('.json')) {
          await this.analyzeJsonFile(itemPath, item);
        }
      }
    } catch (error) {
      this.log(`⚠️ Erreur lors de l'analyse de ${archive.name}: ${error.message}`);
    }
  }

  async analyzeDriverDirectory(dirPath, dirName) {
    this.log(`📁 Analyse du dossier driver: ${dirName}`);
    
    try {
      const items = await fs.readdir(dirPath);
      const driverInfo = {
        name: dirName,
        path: dirPath,
        files: [],
        capabilities: [],
        clusters: [],
        dataPoints: []
      };

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isFile()) {
          driverInfo.files.push(item);
          
          if (item.toLowerCase().endsWith('.js')) {
            await this.extractDriverInfo(itemPath, driverInfo);
          } else if (item.toLowerCase().endsWith('.json')) {
            await this.extractJsonInfo(itemPath, driverInfo);
          }
        }
      }

      this.analysisResults.driversExtracted.push(driverInfo);
      
      // Analyse des améliorations possibles
      await this.analyzeDriverImprovements(driverInfo);
      
    } catch (error) {
      this.log(`⚠️ Erreur lors de l'analyse du dossier ${dirName}: ${error.message}`);
    }
  }

  async extractDriverInfo(filePath, driverInfo) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Extraction des capabilities
      const capabilityMatches = content.match(/registerCapability\(['"`]([^'"`]+)['"`]/g);
      if (capabilityMatches) {
        for (const match of capabilityMatches) {
          const capability = match.replace(/registerCapability\(['"`]|['"`]\)/g, '');
          if (!driverInfo.capabilities.includes(capability)) {
            driverInfo.capabilities.push(capability);
            if (!this.analysisResults.capabilitiesFound.includes(capability)) {
              this.analysisResults.capabilitiesFound.push(capability);
            }
          }
        }
      }

      // Extraction des clusters ZCL
      const clusterMatches = content.match(/clusterId:\s*['"`]?(\w+)['"`]?/g);
      if (clusterMatches) {
        for (const match of clusterMatches) {
          const cluster = match.replace(/clusterId:\s*['"`]?|['"`]?/g, '');
          if (!driverInfo.clusters.includes(cluster)) {
            driverInfo.clusters.push(cluster);
            if (!this.analysisResults.clustersFound.includes(cluster)) {
              this.analysisResults.clustersFound.push(cluster);
            }
          }
        }
      }

      // Extraction des Data Points Tuya
      const dpMatches = content.match(/dpId:\s*['"`]?(\w+)['"`]?/g);
      if (dpMatches) {
        for (const match of dpMatches) {
          const dp = match.replace(/dpId:\s*['"`]?|['"`]?/g, '');
          if (!driverInfo.dataPoints.includes(dp)) {
            driverInfo.dataPoints.push(dp);
            if (!this.analysisResults.dataPointsFound.includes(dp)) {
              this.analysisResults.dataPointsFound.push(dp);
            }
          }
        }
      }

    } catch (error) {
      this.log(`⚠️ Erreur lors de l'extraction des infos de ${filePath}: ${error.message}`);
    }
  }

  async extractJsonInfo(filePath, driverInfo) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const jsonData = JSON.parse(content);
      
      // Extraction des informations du compose.json
      if (jsonData.capabilities && Array.isArray(jsonData.capabilities)) {
        for (const capability of jsonData.capabilities) {
          if (!driverInfo.capabilities.includes(capability)) {
            driverInfo.capabilities.push(capability);
            if (!this.analysisResults.capabilitiesFound.includes(capability)) {
              this.analysisResults.capabilitiesFound.push(capability);
            }
          }
        }
      }

      // Extraction des clusters ZCL
      if (jsonData.zcl && jsonData.zcl.clusters) {
        for (const cluster of Object.keys(jsonData.zcl.clusters)) {
          if (!driverInfo.clusters.includes(cluster)) {
            driverInfo.clusters.push(cluster);
            if (!this.analysisResults.clustersFound.includes(cluster)) {
              this.analysisResults.clustersFound.push(cluster);
            }
          }
        }
      }

      // Extraction des Data Points Tuya
      if (jsonData.tuya && jsonData.tuya.dataPoints) {
        for (const dp of Object.keys(jsonData.tuya.dataPoints)) {
          if (!driverInfo.dataPoints.includes(dp)) {
            driverInfo.dataPoints.push(dp);
            if (!this.analysisResults.dataPointsFound.includes(dp)) {
              this.analysisResults.dataPointsFound.push(dp);
            }
          }
        }
      }

    } catch (error) {
      this.log(`⚠️ Erreur lors de l'extraction JSON de ${filePath}: ${error.message}`);
    }
  }

  async analyzeDriverImprovements(driverInfo) {
    const improvements = [];
    
    // Vérification des fichiers manquants
    const requiredFiles = ['driver.js', 'device.js', 'driver.compose.json'];
    for (const file of requiredFiles) {
      if (!driverInfo.files.includes(file)) {
        improvements.push(`Fichier manquant: ${file}`);
      }
    }

    // Vérification des assets
    if (!driverInfo.files.some(f => f.includes('icon.svg'))) {
      improvements.push('Icône SVG manquante');
    }
    if (!driverInfo.files.some(f => f.includes('images'))) {
      improvements.push('Images manquantes');
    }

    // Vérification de la documentation
    if (!driverInfo.files.some(f => f.includes('README'))) {
      improvements.push('README manquant');
    }

    if (improvements.length > 0) {
      this.analysisResults.improvements.push({
        driver: driverInfo.name,
        improvements: improvements
      });
    }
  }

  async analyzeMissingDrivers() {
    this.log('🔍 ANALYSE DES DRIVERS MANQUANTS...');
    
    // Comparaison avec le catalog SOT
    const catalogPath = path.join(this.projectRoot, 'catalog');
    if (await fs.pathExists(catalogPath)) {
      const categories = await fs.readdir(catalogPath);
      
      for (const category of categories) {
        const categoryPath = path.join(catalogPath, category);
        const categoryStats = await fs.stat(categoryPath);
        
        if (categoryStats.isDirectory()) {
          const vendors = await fs.readdir(categoryPath);
          
          for (const vendor of vendors) {
            const vendorPath = path.join(categoryPath, vendor);
            const vendorStats = await fs.stat(vendorPath);
            
            if (vendorStats.isDirectory()) {
              const products = await fs.readdir(vendorPath);
              
              for (const product of products) {
                const productPath = path.join(vendorPath, product);
                const productStats = await fs.stat(productPath);
                
                if (productStats.isDirectory()) {
                  // Vérifier si le driver existe
                  const driverName = `tuya_${product}`;
                  const driverExists = this.analysisResults.driversExtracted.some(d => d.name === driverName);
                  
                  if (!driverExists) {
                    this.analysisResults.missingDrivers.push({
                      category: category,
                      vendor: vendor,
                      product: product,
                      driverName: driverName
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  async generateAutomationIdeas() {
    this.log('💡 GÉNÉRATION DES IDÉES D\'AUTOMATISATION...');
    
    // Idées basées sur l'analyse des archives
    this.analysisResults.automationIdeas = [
      'Script automatique de génération de drivers depuis le catalog SOT',
      'Validation automatique des clusters ZCL et capabilities',
      'Génération automatique des assets (icônes, images)',
      'Tests automatiques des drivers avec Homey',
      'Synchronisation automatique avec les sources externes',
      'Génération automatique de la documentation',
      'Validation automatique de la compatibilité SDK3+',
      'Tests de performance automatiques',
      'Génération automatique des rapports de qualité',
      'Déploiement automatique vers GitHub Pages'
    ];
  }

  async generateAnalysisReport() {
    this.log('📊 GÉNÉRATION DU RAPPORT D\'ANALYSE...');
    
    const reportPath = path.join(this.reportsDir, `TUYA_ARCHIVES_ANALYSIS_v3.4.1_${new Date().toISOString().split('T')[0]}.md`);
    
    const report = `# 🔍 ANALYSE COMPLÈTE DES ARCHIVES TUYA v3.4.1

## 📊 **RÉSUMÉ EXÉCUTIF**

**📅 Date d'analyse** : ${new Date().toISOString()}  
**🔍 Archives analysées** : ${this.analysisResults.archivesFound.length}  
**📁 Drivers extraits** : ${this.analysisResults.driversExtracted.length}  
**🎯 Capabilities trouvées** : ${this.analysisResults.capabilitiesFound.length}  
**🔌 Clusters ZCL trouvés** : ${this.analysisResults.clustersFound.length}  
**📡 Data Points Tuya trouvés** : ${this.analysisResults.dataPointsFound.length}  

---

## 📦 **ARCHIVES ANALYSÉES**

${this.analysisResults.archivesFound.map(archive => 
  `- **${archive.name}** (${archive.type}) - ${this.formatBytes(archive.size)}`
).join('\n')}

---

## 📁 **DRIVERS EXTRACTÉS ET ANALYSÉS**

${this.analysisResults.driversExtracted.map(driver => `
### **${driver.name}**
- **Fichiers** : ${driver.files.join(', ')}
- **Capabilities** : ${driver.capabilities.join(', ') || 'Aucune'}
- **Clusters ZCL** : ${driver.clusters.join(', ') || 'Aucun'}
- **Data Points Tuya** : ${driver.dataPoints.join(', ') || 'Aucun'}
`).join('\n')}

---

## 🎯 **CAPABILITIES TROUVÉES**

${this.analysisResults.capabilitiesFound.map(cap => `- \`${cap}\``).join('\n')}

---

## 🔌 **CLUSTERS ZCL TROUVÉS**

${this.analysisResults.clustersFound.map(cluster => `- \`${cluster}\``).join('\n')}

---

## 📡 **DATA POINTS TUYA TROUVÉS**

${this.analysisResults.dataPointsFound.map(dp => `- \`${dp}\``).join('\n')}

---

## 🔧 **AMÉLIORATIONS IDENTIFIÉES**

${this.analysisResults.improvements.map(improvement => `
### **${improvement.driver}**
${improvement.improvements.map(imp => `- ${imp}`).join('\n')}
`).join('\n')}

---

## ❌ **DRIVERS MANQUANTS**

${this.analysisResults.missingDrivers.map(missing => 
  `- **${missing.driverName}** (${missing.category}/${missing.vendor}/${missing.product})`
).join('\n')}

---

## 💡 **IDÉES D'AUTOMATISATION**

${this.analysisResults.automationIdeas.map(idea => `- ${idea}`).join('\n')}

---

## 🚀 **RECOMMANDATIONS**

### **Immédiat**
1. **Implémenter** les drivers manquants identifiés
2. **Corriger** les améliorations identifiées
3. **Standardiser** les capabilities et clusters

### **Court terme**
1. **Automatiser** la génération de drivers
2. **Valider** la compatibilité SDK3+
3. **Tester** tous les drivers

### **Moyen terme**
1. **Intégrer** les sources externes
2. **Déployer** le dashboard GitHub Pages
3. **Activer** les workflows GitHub Actions

---

## 📋 **STATISTIQUES FINALES**

| Métrique | Valeur |
|----------|--------|
| **Archives analysées** | ${this.analysisResults.archivesFound.length} |
| **Drivers extraits** | ${this.analysisResults.driversExtracted.length} |
| **Capabilities uniques** | ${this.analysisResults.capabilitiesFound.length} |
| **Clusters ZCL uniques** | ${this.analysisResults.clustersFound.length} |
| **Data Points Tuya uniques** | ${this.analysisResults.dataPointsFound.length} |
| **Améliorations identifiées** | ${this.analysisResults.improvements.length} |
| **Drivers manquants** | ${this.analysisResults.missingDrivers.length} |
| **Idées d'automatisation** | ${this.analysisResults.automationIdeas.length} |

---

**🔍 ANALYSE COMPLÈTE TERMINÉE - PROJET PRÊT POUR L'ENRICHISSEMENT !** 🚀
`;

    await fs.writeFile(reportPath, report, 'utf8');
    this.log(`📊 Rapport généré: ${reportPath}`);
    
    return reportPath;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async run() {
    const startTime = Date.now();
    
    try {
      this.log('🚀 DÉMARRAGE DE L\'ANALYSE COMPLÈTE DES ARCHIVES TUYA...');
      
      await this.ensureDirectoryExists(this.reportsDir);
      
      // Phase 1: Scan des archives
      await this.scanArchives();
      
      // Phase 2: Analyse des archives extraites
      await this.analyzeExtractedArchives();
      
      // Phase 3: Analyse des drivers manquants
      await this.analyzeMissingDrivers();
      
      // Phase 4: Génération des idées d'automatisation
      await this.generateAutomationIdeas();
      
      // Phase 5: Génération du rapport
      const reportPath = await this.generateAnalysisReport();
      
      const duration = Date.now() - startTime;
      this.log(`✅ ANALYSE COMPLÈTE TERMINÉE EN ${duration}ms`);
      this.log(`📊 Rapport généré: ${reportPath}`);
      
      // Affichage des statistiques
      this.log('📊 STATISTIQUES FINALES:', {
        archives: this.analysisResults.archivesFound.length,
        drivers: this.analysisResults.driversExtracted.length,
        capabilities: this.analysisResults.capabilitiesFound.length,
        clusters: this.analysisResults.clustersFound.length,
        dataPoints: this.analysisResults.dataPointsFound.length,
        improvements: this.analysisResults.improvements.length,
        missingDrivers: this.analysisResults.missingDrivers.length
      });
      
    } catch (error) {
      this.log(`❌ ERREUR LORS DE L'ANALYSE: ${error.message}`);
      console.error(error);
    }
  }
}

// Exécution du script
const analyzer = new TuyaArchivesAnalyzer();
analyzer.run().catch(console.error);
