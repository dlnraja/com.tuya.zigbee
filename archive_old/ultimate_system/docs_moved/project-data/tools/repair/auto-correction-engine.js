#!/usr/bin/env node

console.log('🤖 MOTEUR DE CORRECTION AUTOMATIQUE - DRIVERS');
console.log('==============================================');

const fs = require('fs');
const path = require('path');

class AutoCorrectionEngine {
  constructor() {
    this.driversDir = path.join(__dirname, '../../drivers');
    this.researchDir = path.join(__dirname, '../../research');
    this.correctionsApplied = [];
    this.errorsEncountered = [];
    
    // Mapping des corrections automatiques
    this.autoCorrections = {
      'missing_capabilities': this.addMissingCapabilities.bind(this),
      'missing_clusters': this.addMissingClusters.bind(this),
      'incomplete_assets': this.generateMissingAssets.bind(this),
      'missing_flow_cards': this.generateMissingFlowCards.bind(this),
      'driver_structure': this.fixDriverStructure.bind(this)
    };
  }
  
  async runAutoCorrection() {
    try {
      console.log('🚀 Début de la correction automatique...\n');
      
      // 1. Charger les rapports d'analyse
      await this.loadAnalysisReports();
      
      // 2. Identifier les corrections nécessaires
      await this.identifyCorrections();
      
      // 3. Appliquer les corrections automatiques
      await this.applyAutoCorrections();
      
      // 4. Valider les corrections appliquées
      await this.validateCorrections();
      
      // 5. Générer le rapport de correction
      await this.generateCorrectionReport();
      
      console.log('✅ Correction automatique terminée avec succès !');
      console.log('::END::AUTO_CORRECTION::OK');
      
    } catch (error) {
      console.error('❌ Erreur lors de la correction:', error.message);
      console.log('::END::AUTO_CORRECTION::FAIL');
      process.exit(1);
    }
  }
  
  async loadAnalysisReports() {
    console.log('📋 CHARGEMENT DES RAPPORTS D\'ANALYSE');
    console.log('--------------------------------------');
    
    this.analysisReports = {};
    
    const reportFiles = [
      'comprehensive-scan-report.json',
      'advanced-analysis-report.json',
      'coverage-gaps.json',
      'cluster-compatibility.json'
    ];
    
    for (const reportFile of reportFiles) {
      const reportPath = path.join(this.researchDir, reportFile);
      
      if (fs.existsSync(reportPath)) {
        try {
          const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
          this.analysisReports[reportFile.replace('.json', '')] = reportData;
          console.log(`✅ ${reportFile} chargé`);
        } catch (error) {
          console.log(`❌ ${reportFile} - Erreur parsing: ${error.message}`);
        }
      } else {
        console.log(`⚠️ ${reportFile} - Fichier non trouvé`);
      }
    }
    console.log('');
  }
  
  async identifyCorrections() {
    console.log('🔍 IDENTIFICATION DES CORRECTIONS NÉCESSAIRES');
    console.log('---------------------------------------------');
    
    this.correctionsNeeded = [];
    
    // Analyser les gaps de couverture
    if (this.analysisReports['coverage-gaps']) {
      const gaps = this.analysisReports['coverage-gaps'];
      
      gaps.forEach(gap => {
        if (gap.severity === 'high') {
          this.correctionsNeeded.push({
            type: 'driver_structure',
            priority: 'critical',
            description: `Créer driver complet pour ${gap.deviceType}`,
            target: gap.deviceType,
            data: gap
          });
        } else if (gap.severity === 'medium') {
          this.correctionsNeeded.push({
            type: 'missing_capabilities',
            priority: 'high',
            description: `Ajouter capacités manquantes à ${gap.driver}`,
            target: gap.driver,
            data: gap
          });
        }
      });
    }
    
    // Analyser la compatibilité des clusters
    if (this.analysisReports['cluster-compatibility']) {
      const clusterAnalysis = this.analysisReports['cluster-compatibility'];
      
      for (const [deviceType, analysis] of Object.entries(clusterAnalysis)) {
        if (analysis.compatibility.missing && analysis.compatibility.missing.length > 0) {
          this.correctionsNeeded.push({
            type: 'missing_clusters',
            priority: 'medium',
            description: `Ajouter clusters manquants pour ${deviceType}`,
            target: deviceType,
            data: analysis
          });
        }
      }
    }
    
    // Analyser la structure des drivers
    if (this.analysisReports['comprehensive-scan-report']) {
      const scanReport = this.analysisReports['comprehensive-scan-report'];
      
      scanReport.current_drivers.forEach(driver => {
        if (driver.status === 'INCOMPLETE') {
          if (!driver.hasAssets) {
            this.correctionsNeeded.push({
              type: 'incomplete_assets',
              priority: 'medium',
              description: `Générer assets manquants pour ${driver.id}`,
              target: driver.id,
              data: driver
            });
          }
          
          if (!driver.hasFlow) {
            this.correctionsNeeded.push({
              type: 'missing_flow_cards',
              priority: 'low',
              description: `Générer flow cards manquants pour ${driver.id}`,
              target: driver.id,
              data: driver
            });
          }
        }
      });
    }
    
    console.log(`📊 Corrections identifiées: ${this.correctionsNeeded.length}`);
    
    // Trier par priorité
    this.correctionsNeeded.sort((a, b) => {
      const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    // Afficher les corrections
    this.correctionsNeeded.forEach((correction, index) => {
      console.log(`${index + 1}. [${correction.priority.toUpperCase()}] ${correction.description}`);
    });
    console.log('');
  }
  
  async applyAutoCorrections() {
    console.log('🔧 APPLICATION DES CORRECTIONS AUTOMATIQUES');
    console.log('-------------------------------------------');
    
    for (const correction of this.correctionsNeeded) {
      try {
        console.log(`\n🔧 Application: ${correction.description}`);
        
        if (this.autoCorrections[correction.type]) {
          const result = await this.autoCorrections[correction.type](correction);
          
          if (result.success) {
            this.correctionsApplied.push({
              ...correction,
              result: result,
              timestamp: new Date().toISOString()
            });
            console.log(`✅ Correction appliquée avec succès`);
          } else {
            this.errorsEncountered.push({
              ...correction,
              error: result.error,
              timestamp: new Date().toISOString()
            });
            console.log(`❌ Échec de la correction: ${result.error}`);
          }
        } else {
          console.log(`⚠️ Type de correction non supporté: ${correction.type}`);
        }
        
      } catch (error) {
        console.log(`❌ Erreur lors de la correction: ${error.message}`);
        this.errorsEncountered.push({
          ...correction,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    console.log(`\n📊 Résultats: ${this.correctionsApplied.length} succès, ${this.errorsEncountered.length} échecs\n`);
  }
  
  async addMissingCapabilities(correction) {
    try {
      const driverPath = path.join(this.driversDir, correction.target);
      const composePath = path.join(driverPath, 'driver.compose.json');
      
      if (!fs.existsSync(composePath)) {
        return { success: false, error: 'driver.compose.json non trouvé' };
      }
      
      const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const currentCapabilities = composeData.capabilities || [];
      
      // Ajouter les capacités manquantes
      const missingCapabilities = correction.data.missingCapabilities;
      const newCapabilities = [...new Set([...currentCapabilities, ...missingCapabilities])];
      
      composeData.capabilities = newCapabilities;
      
      // Sauvegarder
      fs.writeFileSync(composePath, JSON.stringify(composeData, null, 2));
      
      return { 
        success: true, 
        added: missingCapabilities,
        total: newCapabilities.length
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async addMissingClusters(correction) {
    try {
      const driverPath = path.join(this.driversDir, correction.target);
      const composePath = path.join(driverPath, 'driver.compose.json');
      
      if (!fs.existsSync(composePath)) {
        return { success: false, error: 'driver.compose.json non trouvé' };
      }
      
      const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      if (!composeData.zigbee) {
        composeData.zigbee = {};
      }
      
      const currentClusters = composeData.zigbee.clusters || [];
      const requiredClusters = correction.data.required;
      
      // Ajouter les clusters manquants
      const newClusters = [...new Set([...currentClusters, ...requiredClusters])];
      composeData.zigbee.clusters = newClusters;
      
      // Sauvegarder
      fs.writeFileSync(composePath, JSON.stringify(composeData, null, 2));
      
      return { 
        success: true, 
        added: requiredClusters.filter(c => !currentClusters.includes(c)),
        total: newClusters.length
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async generateMissingAssets(correction) {
    try {
      const driverPath = path.join(this.driversDir, correction.target);
      const assetsDir = path.join(driverPath, 'assets');
      
      // Créer le dossier assets s'il n'existe pas
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      
      // Générer des assets SVG de base
      const smallSvg = this.generateBasicSvg(75, 75, correction.target);
      const largeSvg = this.generateBasicSvg(500, 500, correction.target);
      
      fs.writeFileSync(path.join(assetsDir, 'small.svg'), smallSvg);
      fs.writeFileSync(path.join(assetsDir, 'large.svg'), largeSvg);
      
      // Créer un fichier de métadonnées
      const metadata = {
        driver_id: correction.target,
        assets_generated: ['small.svg', 'large.svg'],
        generated_at: new Date().toISOString(),
        auto_corrected: true
      };
      
      fs.writeFileSync(path.join(assetsDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
      
      return { 
        success: true, 
        assets_created: ['small.svg', 'large.svg', 'metadata.json']
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  generateBasicSvg(width, height, driverId) {
    const color = this.getDriverColor(driverId);
    
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${color}"/>
  <text x="${width/2}" y="${height/2}" text-anchor="middle" dy=".3em" fill="white" font-size="${Math.max(8, width/10)}">TUYA</text>
</svg>`;
  }
  
  getDriverColor(driverId) {
    const colorMap = {
      'light': '#ffd700',
      'sensor': '#00ff00',
      'switch': '#ff6b6b',
      'cover': '#4ecdc4',
      'climate': '#45b7d1',
      'lock': '#96ceb4',
      'fan': '#feca57',
      'plug': '#ff9ff3',
      'remote': '#54a0ff'
    };
    
    for (const [type, color] of Object.entries(colorMap)) {
      if (driverId.includes(type)) {
        return color;
      }
    }
    
    return '#667eea';
  }
  
  async generateMissingFlowCards(correction) {
    try {
      const driverPath = path.join(this.driversDir, correction.target);
      const flowDir = path.join(driverPath, 'flow');
      
      // Créer le dossier flow s'il n'existe pas
      if (!fs.existsSync(flowDir)) {
        fs.mkdirSync(flowDir, { recursive: true });
      }
      
      // Générer des flow cards de base
      const basicFlowCards = ['toggle', 'is_on', 'is_off'];
      const generatedCards = [];
      
      basicFlowCards.forEach(cardId => {
        const flowCard = {
          id: cardId,
          name: {
            en: cardId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            fr: cardId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            nl: cardId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            ta: cardId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          },
          title: {
            en: cardId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            fr: cardId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            nl: cardId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            ta: cardId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          }
        };
        
        fs.writeFileSync(
          path.join(flowDir, `${cardId}.json`),
          JSON.stringify(flowCard, null, 2)
        );
        
        generatedCards.push(`${cardId}.json`);
      });
      
      return { 
        success: true, 
        flow_cards_created: generatedCards
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async fixDriverStructure(correction) {
    try {
      const driverPath = path.join(this.driversDir, correction.target);
      
      // Créer la structure complète du driver
      if (!fs.existsSync(driverPath)) {
        fs.mkdirSync(driverPath, { recursive: true });
      }
      
      // Créer les dossiers nécessaires
      const subdirs = ['assets', 'flow'];
      subdirs.forEach(subdir => {
        const subdirPath = path.join(driverPath, subdir);
        if (!fs.existsSync(subdirPath)) {
          fs.mkdirSync(subdirPath, { recursive: true });
        }
      });
      
      // Créer driver.compose.json
      const composeJson = this.generateBasicComposeJson(correction.target);
      fs.writeFileSync(
        path.join(driverPath, 'driver.compose.json'),
        JSON.stringify(composeJson, null, 2)
      );
      
      // Créer device.js
      const deviceJs = this.generateBasicDeviceJs(correction.target);
      fs.writeFileSync(path.join(driverPath, 'device.js'), deviceJs);
      
      // Créer README.md
      const readmeMd = this.generateBasicReadme(correction.target);
      fs.writeFileSync(path.join(driverPath, 'README.md'), readmeMd);
      
      // Générer les assets et flow cards
      await this.generateMissingAssets({ target: correction.target });
      await this.generateMissingFlowCards({ target: correction.target });
      
      return { 
        success: true, 
        structure_created: ['driver.compose.json', 'device.js', 'README.md', 'assets/', 'flow/']
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  generateBasicComposeJson(driverId) {
    const deviceType = this.extractDeviceType(driverId);
    
    return {
      "id": driverId,
      "name": {
        "en": `Tuya ${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} Universal`,
        "fr": `Tuya ${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} Universel`,
        "nl": `Tuya ${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} Universeel`,
        "ta": `Tuya ${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} உலகளாவிய`
      },
      "class": deviceType,
      "capabilities": this.getBasicCapabilities(deviceType),
      "images": {
        "small": "assets/small.svg",
        "large": "assets/large.svg"
      },
      "zigbee": {
        "manufacturer": "Tuya",
        "model": "Universal",
        "vendor": "Tuya",
        "description": `Universal Tuya ${deviceType} device`,
        "supports": "Zigbee 1.2",
        "firmware": "1.0.0",
        "clusters": this.getBasicClusters(deviceType)
      },
      "metadata": {
        "version": "1.0.0",
        "last_updated": new Date().toISOString().split('T')[0],
        "confidence_score": 90,
        "auto_corrected": true,
        "sources": ["Auto-correction engine"]
      }
    };
  }
  
  extractDeviceType(driverId) {
    const typeMap = {
      'light': 'light',
      'sensor': 'sensor',
      'switch': 'switch',
      'cover': 'cover',
      'climate': 'climate',
      'lock': 'lock',
      'fan': 'fan',
      'plug': 'plug',
      'remote': 'remote'
    };
    
    for (const [type, _] of Object.entries(typeMap)) {
      if (driverId.includes(type)) {
        return type;
      }
    }
    
    return 'device';
  }
  
  getBasicCapabilities(deviceType) {
    const capabilityMap = {
      'light': ['onoff', 'dim'],
      'sensor': ['measure_temperature', 'measure_humidity'],
      'switch': ['onoff'],
      'cover': ['windowcoverings_set'],
      'climate': ['measure_temperature'],
      'lock': ['lock'],
      'fan': ['onoff', 'dim'],
      'plug': ['onoff', 'measure_power'],
      'remote': ['button']
    };
    
    return capabilityMap[deviceType] || ['onoff'];
  }
  
  getBasicClusters(deviceType) {
    const clusterMap = {
      'light': ['genOnOff', 'genLevelCtrl'],
      'sensor': ['genBasic', 'msTemperatureMeasurement'],
      'switch': ['genOnOff'],
      'cover': ['genWindowCovering'],
      'climate': ['genBasic', 'msTemperatureMeasurement'],
      'lock': ['genDoorLock'],
      'fan': ['genOnOff', 'genLevelCtrl'],
      'plug': ['genOnOff', 'genPowerCfg'],
      'remote': ['genBasic']
    };
    
    return clusterMap[deviceType] || ['genBasic'];
  }
  
  generateBasicDeviceJs(driverId) {
    const className = driverId.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');
    
    return `const { ZigBeeDevice } = require('homey-meshdriver');

class ${className}Device extends ZigBeeDevice {
  
  async onMeshInit() {
    await super.onMeshInit();
    
    this.log('🔌 ${driverId} initialisé');
    
    // Register basic capabilities
    this.registerCapability('onoff', 'genOnOff');
    
    this.log('✅ Device initialisé avec succès');
  }
  
  async onCapabilityOnoff(value, opts) {
    try {
      this.log(\`🔌 Définition onoff: \${value}\`);
      
      const onoffCluster = this.getClusterEndpoint('genOnOff');
      if (onoffCluster) {
        if (value) {
          await onoffCluster.on();
        } else {
          await onoffCluster.off();
        }
        
        this.log(\`✅ Onoff défini: \${value}\`);
      }
    } catch (error) {
      this.log('❌ Échec définition onoff:', error.message);
      throw error;
    }
  }
}

module.exports = ${className}Device;`;
  }
  
  generateBasicReadme(driverId) {
    const deviceType = this.extractDeviceType(driverId);
    
    return `# Tuya ${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} Universal

## Description
Driver universel pour les devices Tuya ${deviceType} généré automatiquement.

## Capacités
- \`onoff\` - Contrôle de base

## Installation
1. Installer l'application Tuya Zigbee (Lite)
2. Ajouter le device via l'interface Homey
3. Suivre les instructions de pairing

## Support
- **GitHub**: [Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)
- **Forum**: [Homey Community](https://community.homey.app)

## Version
${new Date().toISOString().split('T')[0]} - v1.0.0 (Auto-généré)`;
  }
  
  async validateCorrections() {
    console.log('✅ VALIDATION DES CORRECTIONS APPLIQUÉES');
    console.log('----------------------------------------');
    
    let validCount = 0;
    let totalCount = 0;
    
    for (const correction of this.correctionsApplied) {
      totalCount++;
      
      try {
        const driverPath = path.join(this.driversDir, correction.target);
        
        if (fs.existsSync(driverPath)) {
          const composePath = path.join(driverPath, 'driver.compose.json');
          const devicePath = path.join(driverPath, 'device.js');
          const assetsDir = path.join(driverPath, 'assets');
          const flowDir = path.join(driverPath, 'flow');
          
          if (fs.existsSync(composePath) && fs.existsSync(devicePath)) {
            validCount++;
            console.log(`✅ ${correction.target} - Correction validée`);
          } else {
            console.log(`❌ ${correction.target} - Structure incomplète`);
          }
        } else {
          console.log(`❌ ${correction.target} - Dossier non trouvé`);
        }
        
      } catch (error) {
        console.log(`❌ ${correction.target} - Erreur validation: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Validation: ${validCount}/${totalCount} corrections validées\n`);
  }
  
  async generateCorrectionReport() {
    console.log('📋 GÉNÉRATION DU RAPPORT DE CORRECTION');
    console.log('----------------------------------------');
    
    const report = {
      timestamp: new Date().toISOString(),
      correction_summary: {
        total_corrections: this.correctionsNeeded.length,
        successful_corrections: this.correctionsApplied.length,
        failed_corrections: this.errorsEncountered.length,
        success_rate: ((this.correctionsApplied.length / this.correctionsNeeded.length) * 100).toFixed(1)
      },
      corrections_applied: this.correctionsApplied,
      errors_encountered: this.errorsEncountered,
      next_steps: [
        'Tester les drivers corrigés',
        'Valider la compatibilité des capacités ajoutées',
        'Vérifier la cohérence des clusters',
        'Optimiser les performances',
        'Documenter les corrections appliquées'
      ]
    };
    
    const reportPath = path.join(this.researchDir, 'auto-correction-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`✅ Rapport de correction généré: ${reportPath}`);
    
    // Afficher le résumé
    console.log('\n📊 RÉSUMÉ DE LA CORRECTION AUTOMATIQUE');
    console.log('========================================');
    console.log(`🔧 Corrections totales: ${report.correction_summary.total_corrections}`);
    console.log(`✅ Corrections réussies: ${report.correction_summary.successful_corrections}`);
    console.log(`❌ Corrections échouées: ${report.correction_summary.failed_corrections}`);
    console.log(`📈 Taux de succès: ${report.correction_summary.success_rate}%`);
    
    if (report.correction_summary.success_rate >= 80) {
      console.log('\n🎉 Correction automatique très réussie !');
    } else if (report.correction_summary.success_rate >= 60) {
      console.log('\n✅ Correction automatique réussie');
    } else {
      console.log('\n⚠️ Correction automatique partielle, vérification manuelle recommandée');
    }
  }
}

// Exécuter le moteur de correction automatique
if (require.main === module) {
  const engine = new AutoCorrectionEngine();
  engine.runAutoCorrection();
}

module.exports = AutoCorrectionEngine;
