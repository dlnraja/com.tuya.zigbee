#!/usr/bin/env node

console.log('🔍 ANALYSE MANUELLE DES ARCHIVES TUYA v3.4.1 Starting...');

const fs = require('fs-extra');
const path = require('path');

class ManualTuyaAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.tmpDir = path.join(this.projectRoot, '.tmp_tuya_zip_work');
    this.reportsDir = path.join(this.projectRoot, 'reports');
    this.analysisResults = {
      archivesFound: [],
      driversAnalyzed: [],
      capabilitiesFound: new Set(),
      clustersFound: new Set(),
      dataPointsFound: new Set(),
      manufacturerNames: new Set(),
      productIds: new Set(),
      improvements: [],
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
    
    if (await fs.pathExists(this.tmpDir)) {
      const items = await fs.readdir(this.tmpDir);
      
      for (const item of items) {
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
      // Ignore errors
    }
    return totalSize;
  }

  async analyzeArchive(archive) {
    this.log(`📂 Analyse de: ${archive.name}`);
    
    const driversPath = path.join(archive.path, 'drivers');
    if (await fs.pathExists(driversPath)) {
      await this.analyzeDriversDirectory(driversPath, archive.name);
    }
  }

  async analyzeDriversDirectory(driversPath, archiveName) {
    try {
      const drivers = await fs.readdir(driversPath);
      
      for (const driver of drivers) {
        const driverPath = path.join(driversPath, driver);
        const driverStats = await fs.stat(driverPath);
        
        if (driverStats.isDirectory()) {
          await this.analyzeDriver(driverPath, driver, archiveName);
        }
      }
    } catch (error) {
      this.log(`⚠️ Erreur lors de l'analyse des drivers de ${archiveName}: ${error.message}`);
    }
  }

  async analyzeDriver(driverPath, driverName, archiveName) {
    try {
      const driverInfo = {
        name: driverName,
        archive: archiveName,
        path: driverPath,
        files: [],
        capabilities: [],
        clusters: [],
        dataPoints: [],
        manufacturerNames: [],
        productIds: [],
        hasDeviceJs: false,
        hasDriverCompose: false,
        hasAssets: false,
        hasSettings: false
      };

      const items = await fs.readdir(driverPath);
      
      for (const item of items) {
        const itemPath = path.join(driverPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isFile()) {
          driverInfo.files.push(item);
          
          if (item === 'device.js') {
            driverInfo.hasDeviceJs = true;
            await this.extractDeviceInfo(itemPath, driverInfo);
          } else if (item === 'driver.compose.json') {
            driverInfo.hasDriverCompose = true;
            await this.extractComposeInfo(itemPath, driverInfo);
          } else if (item === 'driver.settings.compose.json') {
            driverInfo.hasSettings = true;
          }
        } else if (stats.isDirectory() && item === 'assets') {
          driverInfo.hasAssets = true;
        }
      }

      this.analysisResults.driversAnalyzed.push(driverInfo);
      
      // Analyse des améliorations
      this.analyzeDriverImprovements(driverInfo);
      
    } catch (error) {
      this.log(`⚠️ Erreur lors de l'analyse du driver ${driverName}: ${error.message}`);
    }
  }

  async extractDeviceInfo(filePath, driverInfo) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Extraction des capabilities
      const capabilityMatches = content.match(/registerCapability\(['"`]([^'"`]+)['"`]/g);
      if (capabilityMatches) {
        for (const match of capabilityMatches) {
          const capability = match.replace(/registerCapability\(['"`]|['"`]\)/g, '');
          if (!driverInfo.capabilities.includes(capability)) {
            driverInfo.capabilities.push(capability);
            this.analysisResults.capabilitiesFound.add(capability);
          }
        }
      }

      // Extraction des clusters ZCL
      const clusterMatches = content.match(/CLUSTER\.(\w+)/g);
      if (clusterMatches) {
        for (const match of clusterMatches) {
          const cluster = match.replace('CLUSTER.', '');
          if (!driverInfo.clusters.includes(cluster)) {
            driverInfo.clusters.push(cluster);
            this.analysisResults.clustersFound.add(cluster);
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
            this.analysisResults.dataPointsFound.add(dp);
          }
        }
      }

    } catch (error) {
      this.log(`⚠️ Erreur lors de l'extraction des infos de ${filePath}: ${error.message}`);
    }
  }

  async extractComposeInfo(filePath, driverInfo) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const jsonData = JSON.parse(content);
      
      // Extraction des capabilities
      if (jsonData.capabilities && Array.isArray(jsonData.capabilities)) {
        for (const capability of jsonData.capabilities) {
          if (!driverInfo.capabilities.includes(capability)) {
            driverInfo.capabilities.push(capability);
            this.analysisResults.capabilitiesFound.add(capability);
          }
        }
      }

      // Extraction des clusters ZCL
      if (jsonData.zigbee && jsonData.zigbee.endpoints) {
        for (const endpoint of Object.values(jsonData.zigbee.endpoints)) {
          if (endpoint.clusters && Array.isArray(endpoint.clusters)) {
            for (const cluster of endpoint.clusters) {
              if (!driverInfo.clusters.includes(cluster.toString())) {
                driverInfo.clusters.push(cluster.toString());
                this.analysisResults.clustersFound.add(cluster.toString());
              }
            }
          }
        }
      }

      // Extraction des manufacturer names
      if (jsonData.zigbee && jsonData.zigbee.manufacturerName) {
        for (const manufacturer of jsonData.zigbee.manufacturerName) {
          if (!driverInfo.manufacturerNames.includes(manufacturer)) {
            driverInfo.manufacturerNames.push(manufacturer);
            this.analysisResults.manufacturerNames.add(manufacturer);
          }
        }
      }

      // Extraction des product IDs
      if (jsonData.zigbee && jsonData.zigbee.productId) {
        for (const productId of jsonData.zigbee.productId) {
          if (!driverInfo.productIds.includes(productId)) {
            driverInfo.productIds.push(productId);
            this.analysisResults.productIds.add(productId);
          }
        }
      }

    } catch (error) {
      this.log(`⚠️ Erreur lors de l'extraction JSON de ${filePath}: ${error.message}`);
    }
  }

  analyzeDriverImprovements(driverInfo) {
    const improvements = [];
    
    if (!driverInfo.hasDeviceJs) {
      improvements.push('device.js manquant');
    }
    if (!driverInfo.hasDriverCompose) {
      improvements.push('driver.compose.json manquant');
    }
    if (!driverInfo.hasAssets) {
      improvements.push('dossier assets manquant');
    }
    if (!driverInfo.hasSettings) {
      improvements.push('driver.settings.compose.json manquant');
    }

    if (improvements.length > 0) {
      this.analysisResults.improvements.push({
        driver: driverInfo.name,
        archive: driverInfo.archive,
        improvements: improvements
      });
    }
  }

  generateAutomationIdeas() {
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
      'Déploiement automatique vers GitHub Pages',
      'Migration automatique des drivers vers SDK3+',
      'Génération automatique des fichiers de configuration',
      'Validation automatique des manufacturer names et product IDs',
      'Tests de compatibilité automatiques'
    ];
  }

  async generateAnalysisReport() {
    this.log('📊 GÉNÉRATION DU RAPPORT D\'ANALYSE...');
    
    const reportPath = path.join(this.reportsDir, `MANUAL_TUYA_ANALYSIS_v3.4.1_${new Date().toISOString().split('T')[0]}.md`);
    
    const report = `# 🔍 ANALYSE MANUELLE COMPLÈTE DES ARCHIVES TUYA v3.4.1

## 📊 **RÉSUMÉ EXÉCUTIF**

**📅 Date d'analyse** : ${new Date().toISOString()}  
**🔍 Archives analysées** : ${this.analysisResults.archivesFound.length}  
**📁 Drivers analysés** : ${this.analysisResults.driversAnalyzed.length}  
**🎯 Capabilities uniques** : ${this.analysisResults.capabilitiesFound.size}  
**🔌 Clusters ZCL uniques** : ${this.analysisResults.clustersFound.size}  
**📡 Data Points Tuya uniques** : ${this.analysisResults.dataPointsFound.size}  
**🏭 Manufacturer Names uniques** : ${this.analysisResults.manufacturerNames.size}  
**🆔 Product IDs uniques** : ${this.analysisResults.productIds.size}  

---

## 📦 **ARCHIVES ANALYSÉES**

${this.analysisResults.archivesFound.map(archive => 
  `- **${archive.name}** (${archive.type}) - ${this.formatBytes(archive.size)}`
).join('\n')}

---

## 📁 **DRIVERS ANALYSÉS**

${this.analysisResults.driversAnalyzed.map(driver => `
### **${driver.name}** (${driver.archive})
- **Fichiers** : ${driver.files.join(', ')}
- **Capabilities** : ${driver.capabilities.join(', ') || 'Aucune'}
- **Clusters ZCL** : ${driver.clusters.join(', ') || 'Aucun'}
- **Data Points Tuya** : ${driver.dataPoints.join(', ') || 'Aucun'}
- **Manufacturer Names** : ${driver.manufacturerNames.join(', ') || 'Aucun'}
- **Product IDs** : ${driver.productIds.join(', ') || 'Aucun'}
- **Structure** : ${driver.hasDeviceJs ? '✅' : '❌'} device.js, ${driver.hasDriverCompose ? '✅' : '❌'} compose.json, ${driver.hasAssets ? '✅' : '❌'} assets, ${driver.hasSettings ? '✅' : '❌'} settings
`).join('\n')}

---

## 🎯 **CAPABILITIES TROUVÉES**

${Array.from(this.analysisResults.capabilitiesFound).map(cap => `- \`${cap}\``).join('\n')}

---

## 🔌 **CLUSTERS ZCL TROUVÉS**

${Array.from(this.analysisResults.clustersFound).map(cluster => `- \`${cluster}\``).join('\n')}

---

## 📡 **DATA POINTS TUYA TROUVÉS**

${Array.from(this.analysisResults.dataPointsFound).map(dp => `- \`${dp}\``).join('\n')}

---

## 🏭 **MANUFACTURER NAMES TROUVÉS**

${Array.from(this.analysisResults.manufacturerNames).map(manufacturer => `- \`${manufacturer}\``).join('\n')}

---

## 🆔 **PRODUCT IDS TROUVÉS**

${Array.from(this.analysisResults.productIds).map(productId => `- \`${productId}\``).join('\n')}

---

## 🔧 **AMÉLIORATIONS IDENTIFIÉES**

${this.analysisResults.improvements.map(improvement => `
### **${improvement.driver}** (${improvement.archive})
${improvement.improvements.map(imp => `- ${imp}`).join('\n')}
`).join('\n')}

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
| **Drivers analysés** | ${this.analysisResults.driversAnalyzed.length} |
| **Capabilities uniques** | ${this.analysisResults.capabilitiesFound.size} |
| **Clusters ZCL uniques** | ${this.analysisResults.clustersFound.size} |
| **Data Points Tuya uniques** | ${this.analysisResults.dataPointsFound.size} |
| **Manufacturer Names uniques** | ${this.analysisResults.manufacturerNames.size} |
| **Product IDs uniques** | ${this.analysisResults.productIds.size} |
| **Améliorations identifiées** | ${this.analysisResults.improvements.length} |
| **Idées d'automatisation** | ${this.analysisResults.automationIdeas.length} |

---

**🔍 ANALYSE MANUELLE COMPLÈTE TERMINÉE - PROJET PRÊT POUR L'ENRICHISSEMENT !** 🚀
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
      this.log('🚀 DÉMARRAGE DE L\'ANALYSE MANUELLE DES ARCHIVES TUYA...');
      
      await this.ensureDirectoryExists(this.reportsDir);
      
      // Phase 1: Scan des archives
      await this.scanArchives();
      
      // Phase 2: Analyse de chaque archive
      for (const archive of this.analysisResults.archivesFound) {
        await this.analyzeArchive(archive);
      }
      
      // Phase 3: Génération des idées d'automatisation
      this.generateAutomationIdeas();
      
      // Phase 4: Génération du rapport
      const reportPath = await this.generateAnalysisReport();
      
      const duration = Date.now() - startTime;
      this.log(`✅ ANALYSE MANUELLE TERMINÉE EN ${duration}ms`);
      this.log(`📊 Rapport généré: ${reportPath}`);
      
      // Affichage des statistiques
      this.log('📊 STATISTIQUES FINALES:', {
        archives: this.analysisResults.archivesFound.length,
        drivers: this.analysisResults.driversAnalyzed.length,
        capabilities: this.analysisResults.capabilitiesFound.size,
        clusters: this.analysisResults.clustersFound.size,
        dataPoints: this.analysisResults.dataPointsFound.size,
        manufacturerNames: this.analysisResults.manufacturerNames.size,
        productIds: this.analysisResults.productIds.size,
        improvements: this.analysisResults.improvements.length
      });
      
    } catch (error) {
      this.log(`❌ ERREUR LORS DE L'ANALYSE: ${error.message}`);
      console.error(error);
    }
  }
}

// Exécution du script
const analyzer = new ManualTuyaAnalyzer();
analyzer.run().catch(console.error);
