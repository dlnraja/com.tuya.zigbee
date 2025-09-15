const fs = require('fs');
const path = require('path');

class CompleteDriverRestoration {
  constructor() {
    this.restored = [];
    this.errors = [];
  }

  async restoreAllDrivers() {
    console.log('🔄 RESTORATION COMPLÈTE DE TOUS LES DRIVERS...\n');
    
    // 1. Identifier tous les backups disponibles
    await this.identifyAllBackups();
    
    // 2. Restaurer TOUS les drivers depuis TOUS les backups
    await this.restoreFromAllBackups();
    
    // 3. Créer structure SDK3 cohérente avec TOUS les drivers
    await this.createCoherentSDK3Structure();
    
    // 4. Corriger toutes les références
    await this.fixAllReferences();
    
    // 5. Générer rapport complet
    this.generateCompleteReport();
  }

  async identifyAllBackups() {
    console.log('🔍 Identification de tous les backups...');
    
    this.backupPaths = [
      './drivers_backup',
      './drivers_validation_backup', 
      './drivers_minimal_backup',
      './drivers_ultra_backup',
      './backup_drivers',
      './backup-2025-09-11T18-15-11-470Z/drivers'
    ];
    
    this.availableBackups = this.backupPaths.filter(backup => fs.existsSync(backup));
    
    console.log(`📊 Backups trouvés: ${this.availableBackups.length}`);
    for (const backup of this.availableBackups) {
      console.log(`  - ${backup}`);
    }
    console.log('');
  }

  async restoreFromAllBackups() {
    console.log('📦 Restauration depuis TOUS les backups...');
    
    // Créer nouveau dossier drivers propre
    if (fs.existsSync('./drivers')) {
      fs.rmSync('./drivers', { recursive: true, force: true });
    }
    fs.mkdirSync('./drivers', { recursive: true });
    
    const allDrivers = new Map(); // Pour éviter doublons
    
    // Scanner tous les backups
    for (const backupPath of this.availableBackups) {
      console.log(`\n📁 Scanning ${backupPath}...`);
      
      const items = fs.readdirSync(backupPath, { withFileTypes: true });
      
      for (const item of items) {
        if (!item.isDirectory()) continue;
        
        const driverPath = path.join(backupPath, item.name);
        const composeFile = path.join(driverPath, 'driver.compose.json');
        
        if (fs.existsSync(composeFile)) {
          try {
            const config = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
            const driverId = config.id || item.name;
            
            if (!allDrivers.has(driverId)) {
              allDrivers.set(driverId, {
                id: driverId,
                path: driverPath,
                backup: backupPath,
                config: config
              });
              console.log(`  ✅ ${driverId}`);
            } else {
              console.log(`  ⚠️ ${driverId} (déjà trouvé)`);
            }
          } catch (error) {
            console.log(`  ❌ ${item.name}: ${error.message}`);
          }
        }
      }
    }
    
    // Restaurer tous les drivers uniques
    console.log(`\n📊 Restauration de ${allDrivers.size} drivers uniques...`);
    
    for (const [driverId, driverInfo] of allDrivers) {
      const targetPath = path.join('./drivers', driverId);
      
      try {
        this.copyDirectory(driverInfo.path, targetPath);
        this.restored.push(driverId);
        console.log(`  ✅ ${driverId}`);
      } catch (error) {
        this.errors.push(`${driverId}: ${error.message}`);
        console.log(`  ❌ ${driverId}: ${error.message}`);
      }
    }
    
    console.log(`\n📈 Total drivers restaurés: ${this.restored.length}`);
  }

  copyDirectory(source, target) {
    fs.mkdirSync(target, { recursive: true });
    const items = fs.readdirSync(source, { withFileTypes: true });
    
    for (const item of items) {
      const sourcePath = path.join(source, item.name);
      const targetPath = path.join(target, item.name);
      
      if (item.isDirectory()) {
        this.copyDirectory(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }

  async createCoherentSDK3Structure() {
    console.log('🏗️ Création structure SDK3 cohérente...');
    
    const driversPath = './drivers';
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    console.log(`📊 Processing ${drivers.length} drivers pour SDK3...`);
    
    let processed = 0;
    for (const driverId of drivers) {
      await this.ensureSDK3Compliance(driverId);
      processed++;
      if (processed % 10 === 0) {
        console.log(`  📈 Processed ${processed}/${drivers.length}`);
      }
    }
    
    console.log(`✅ Structure SDK3 appliquée à ${processed} drivers`);
  }

  async ensureSDK3Compliance(driverId) {
    const driverPath = path.join('./drivers', driverId);
    const composeFile = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composeFile)) return;
    
    try {
      const config = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      let modified = false;
      
      // Assurer ID correct
      if (!config.id || config.id !== driverId) {
        config.id = driverId;
        modified = true;
      }
      
      // Images avec template path
      if (!config.images || typeof config.images.small !== 'string' || !config.images.small.includes('{{driverAssetsPath}}')) {
        config.images = {
          small: "{{driverAssetsPath}}/images/small.png",
          large: "{{driverAssetsPath}}/images/large.png"
        };
        modified = true;
      }
      
      // Convertir clusters/bindings en numérique
      if (config.zigbee?.endpoints) {
        for (const [endpoint, endpointConfig] of Object.entries(config.zigbee.endpoints)) {
          if (endpointConfig.clusters) {
            const newClusters = endpointConfig.clusters.map(cluster => {
              if (typeof cluster === 'string' && cluster.startsWith('0x')) {
                return parseInt(cluster, 16);
              }
              return typeof cluster === 'number' ? cluster : parseInt(cluster, 10) || 0;
            });
            
            if (JSON.stringify(newClusters) !== JSON.stringify(endpointConfig.clusters)) {
              endpointConfig.clusters = newClusters;
              modified = true;
            }
          }
          
          if (endpointConfig.bindings) {
            const newBindings = endpointConfig.bindings.map(binding => {
              if (typeof binding === 'object') return binding;
              if (typeof binding === 'string' && binding.startsWith('0x')) {
                return parseInt(binding, 16);
              }
              return typeof binding === 'number' ? binding : parseInt(binding, 10) || 1;
            });
            
            if (JSON.stringify(newBindings) !== JSON.stringify(endpointConfig.bindings)) {
              endpointConfig.bindings = newBindings;
              modified = true;
            }
          }
        }
      }
      
      // Energy config pour battery devices
      if (config.capabilities?.includes('measure_battery') && !config.energy) {
        config.energy = { batteries: ['INTERNAL'] };
        modified = true;
      }
      
      // Assurer assets/images existe
      const assetsPath = path.join(driverPath, 'assets', 'images');
      fs.mkdirSync(assetsPath, { recursive: true });
      
      // Créer images si manquantes
      const placeholderPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
      
      ['small.png', 'large.png'].forEach(imgFile => {
        const imgPath = path.join(assetsPath, imgFile);
        if (!fs.existsSync(imgPath)) {
          fs.writeFileSync(imgPath, placeholderPng);
        }
      });
      
      if (modified) {
        fs.writeFileSync(composeFile, JSON.stringify(config, null, 2));
      }
      
    } catch (error) {
      this.errors.push(`SDK3 compliance ${driverId}: ${error.message}`);
    }
  }

  async fixAllReferences() {
    console.log('🔧 Correction de toutes les références...');
    
    // Régénérer app.json avec tous les drivers
    await this.regenerateAppJson();
    
    // Corriger package.json
    await this.fixPackageJson();
    
    // S'assurer que app.js est correct
    await this.ensureAppJs();
    
    console.log('✅ Toutes les références corrigées');
  }

  async regenerateAppJson() {
    const drivers = fs.readdirSync('./drivers', { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name)
      .sort();
    
    const appConfig = {
      "main": "app.js",
      "id": "com.dlnraja.ultimate.zigbee.hub",
      "version": "5.0.0",
      "compatibility": ">=8.0.0",
      "sdk": 3,
      "category": ["lights", "security"],
      "name": {
        "en": "Ultimate Zigbee Hub - Complete Restoration",
        "fr": "Hub Zigbee Ultime - Restauration Complète", 
        "nl": "Ultieme Zigbee Hub - Volledige Restauratie"
      },
      "description": {
        "en": `Comprehensive Zigbee device support with ${drivers.length} enriched drivers - Full restoration`,
        "fr": `Support complet des appareils Zigbee avec ${drivers.length} pilotes enrichis - Restauration complète`,
        "nl": `Uitgebreide Zigbee apparaat ondersteuning met ${drivers.length} verrijkte drivers - Volledige restauratie`
      },
      "author": {
        "name": "dlnraja",
        "email": "dylan.rajasekaram@gmail.com"
      },
      "contributors": {
        "developers": ["dlnraja"],
        "homey_community": ["Johan Benz", "Community Contributors"],
        "ai_enhancement": ["Comprehensive AI Analysis & Enhancement"]
      },
      "support": "mailto:dylan.rajasekaram@gmail.com",
      "homepage": "https://github.com/dlnraja/tuya_repair",
      "license": "MIT",
      "platforms": ["local"],
      "connectivity": ["zigbee"],
      "permissions": ["homey:manager:api"],
      "brandColor": "#00A0DC"
    };

    fs.writeFileSync('./app.json', JSON.stringify(appConfig, null, 2));
    console.log(`📄 app.json régénéré avec ${drivers.length} drivers`);
  }

  async fixPackageJson() {
    const packageConfig = {
      "name": "com.dlnraja.ultimate.zigbee.hub",
      "version": "5.0.0",
      "description": "Ultimate Zigbee Hub with comprehensive driver support",
      "main": "app.js",
      "dependencies": {
        "homey-zigbeedriver": "^3.0.0"
      },
      "engines": {
        "node": ">=16"
      }
    };

    fs.writeFileSync('./package.json', JSON.stringify(packageConfig, null, 2));
    console.log('📄 package.json corrigé');
  }

  async ensureAppJs() {
    const appCode = `'use strict';

const Homey = require('homey');

class UltimateZigbeeApp extends Homey.App {
  
  async onInit() {
    this.log('🚀 Ultimate Zigbee Hub - Complete Restoration - App initialized');
    this.log(\`📊 App running with \${Object.keys(this.homey.drivers.getDrivers()).length} drivers\`);
  }
  
}

module.exports = UltimateZigbeeApp;
`;

    fs.writeFileSync('./app.js', appCode);
    console.log('📄 app.js corrigé');
  }

  generateCompleteReport() {
    console.log('\n📊 RAPPORT COMPLET DE RESTAURATION:');
    console.log(`✅ Drivers restaurés avec succès: ${this.restored.length}`);
    console.log(`❌ Erreurs rencontrées: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERREURS:');
      for (const error of this.errors.slice(0, 10)) { // Montrer max 10 erreurs
        console.log(`  - ${error}`);
      }
      if (this.errors.length > 10) {
        console.log(`  ... et ${this.errors.length - 10} autres erreurs`);
      }
    }
    
    console.log('\n📋 DRIVERS RESTAURÉS (premiers 20):');
    for (const driver of this.restored.slice(0, 20)) {
      console.log(`  ✅ ${driver}`);
    }
    if (this.restored.length > 20) {
      console.log(`  ... et ${this.restored.length - 20} autres drivers`);
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      restored: this.restored,
      errors: this.errors,
      totalDrivers: this.restored.length,
      structure: 'SDK3_compliant',
      purpose: 'complete_restoration_for_enrichment'
    };
    
    fs.writeFileSync('./complete_restoration_report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Rapport complet sauvé: complete_restoration_report.json');
    
    console.log('\n🎯 PROCHAINES ÉTAPES:');
    console.log('1. Exécuter algorithmes d\'enrichissement un par un');
    console.log('2. Validation itérative jusqu\'à succès complet');
    console.log('3. Tests exhaustifs de tous les drivers');
  }
}

// Exécuter la restauration complète
const restorer = new CompleteDriverRestoration();
restorer.restoreAllDrivers().catch(console.error);
