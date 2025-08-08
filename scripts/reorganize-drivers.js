#!/usr/bin/env node

/**
 * 🔧 REORGANIZE DRIVERS
 * Réorganisation complète de tous les drivers
 * Mode YOLO Ultra - Exécution immédiate
 */

const fs = require('fs');
const path = require('path');

class DriverReorganizer {
  constructor() {
    this.driverStructure = {
      tuya: {
        automation: ['automation', 'controllers'],
        climate: ['climate', 'thermostats'],
        covers: ['covers'],
        generic: ['generic'],
        lighting: ['lighting', 'lights'],
        locks: ['locks'],
        plugs: ['plugs'],
        security: ['security'],
        sensors: ['sensors'],
        switches: ['switches'],
        unknown: ['unknown']
      },
      zigbee: {
        automation: ['automation'],
        covers: ['covers'],
        dimmers: ['dimmers'],
        lights: ['lights'],
        onoff: ['onoff'],
        plugs: ['plugs'],
        security: ['security'],
        sensors: ['sensors'],
        switches: ['switches'],
        thermostats: ['thermostats']
      }
    };
  }

  async run() {
    console.log('🔧 DÉMARRAGE REORGANIZE DRIVERS');
    
    try {
      // 1. Sauvegarder l'état actuel
      await this.backupCurrentState();
      
      // 2. Réorganiser les drivers Tuya
      await this.reorganizeTuyaDrivers();
      
      // 3. Réorganiser les drivers Zigbee
      await this.reorganizeZigbeeDrivers();
      
      // 4. Nettoyer les fichiers orphelins
      await this.cleanupOrphanFiles();
      
      // 5. Valider la nouvelle structure
      await this.validateNewStructure();
      
      // 6. Rapport final
      await this.generateReport();
      
      console.log('✅ REORGANIZE DRIVERS RÉUSSI !');
      
    } catch (error) {
      console.error('❌ ERREUR:', error.message);
      throw error;
    }
  }

  async backupCurrentState() {
    console.log('💾 Sauvegarde de l\'état actuel...');
    
    const backupDir = 'backup/drivers-' + new Date().toISOString().replace(/[:.]/g, '-');
    fs.mkdirSync(backupDir, { recursive: true });
    
    // Copier tous les drivers
    if (fs.existsSync('drivers')) {
      this.copyDirectory('drivers', backupDir + '/drivers');
    }
    
    console.log('✅ Sauvegarde créée:', backupDir);
  }

  copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      
      if (fs.statSync(srcPath).isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  async reorganizeTuyaDrivers() {
    console.log('🔧 Réorganisation des drivers Tuya...');
    
    const tuyaPath = 'drivers/tuya';
    if (!fs.existsSync(tuyaPath)) {
      throw new Error('Dossier drivers/tuya non trouvé');
    }
    
    // Créer la nouvelle structure
    for (const [category, subcategories] of Object.entries(this.driverStructure.tuya)) {
      const categoryPath = path.join(tuyaPath, category);
      if (!fs.existsSync(categoryPath)) {
        fs.mkdirSync(categoryPath, { recursive: true });
      }
      
      // Créer le driver.compose.json pour chaque catégorie
      await this.createDriverCompose(categoryPath, 'tuya', category);
      
      // Créer le driver.js pour chaque catégorie
      await this.createDriverJS(categoryPath, 'tuya', category);
    }
    
    console.log('✅ Drivers Tuya réorganisés');
  }

  async reorganizeZigbeeDrivers() {
    console.log('🔧 Réorganisation des drivers Zigbee...');
    
    const zigbeePath = 'drivers/zigbee';
    if (!fs.existsSync(zigbeePath)) {
      throw new Error('Dossier drivers/zigbee non trouvé');
    }
    
    // Créer la nouvelle structure
    for (const [category, subcategories] of Object.entries(this.driverStructure.zigbee)) {
      const categoryPath = path.join(zigbeePath, category);
      if (!fs.existsSync(categoryPath)) {
        fs.mkdirSync(categoryPath, { recursive: true });
      }
      
      // Créer le driver.compose.json pour chaque catégorie
      await this.createDriverCompose(categoryPath, 'zigbee', category);
      
      // Créer le driver.js pour chaque catégorie
      await this.createDriverJS(categoryPath, 'zigbee', category);
    }
    
    console.log('✅ Drivers Zigbee réorganisés');
  }

  async createDriverCompose(categoryPath, type, category) {
    const driverCompose = {
      id: `${type}-${category}`,
      name: {
        en: `${type.charAt(0).toUpperCase() + type.slice(1)} ${category.charAt(0).toUpperCase() + category.slice(1)}`,
        fr: `${type.charAt(0).toUpperCase() + type.slice(1)} ${category.charAt(0).toUpperCase() + category.slice(1)}`,
        nl: `${type.charAt(0).toUpperCase() + type.slice(1)} ${category.charAt(0).toUpperCase() + category.slice(1)}`,
        ta: `${type.charAt(0).toUpperCase() + type.slice(1)} ${category.charAt(0).toUpperCase() + category.slice(1)}`
      },
      capabilities: this.getCapabilitiesForCategory(category),
      class: this.getClassForCategory(category),
      zigbee: this.getZigbeeConfigForCategory(category),
      images: {
        small: `assets/images/${type}-${category}-small.png`,
        large: `assets/images/${type}-${category}-large.png`
      }
    };
    
    fs.writeFileSync(path.join(categoryPath, 'driver.compose.json'), JSON.stringify(driverCompose, null, 2));
  }

  async createDriverJS(categoryPath, type, category) {
    const driverJS = `const { ZigbeeDevice } = require('homey-meshdriver');

class ${type.charAt(0).toUpperCase() + type.slice(1)}${category.charAt(0).toUpperCase() + category.slice(1)} extends ZigbeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        
        // Logique spécifique au driver
        console.log('${type.charAt(0).toUpperCase() + type.slice(1)} ${category.charAt(0).toUpperCase() + category.slice(1)} initialized');
        
        // Enregistrer les capacités
        ${this.getCapabilitiesForCategory(category).map(cap => `this.registerCapability('${cap}', 'cluster');`).join('\n        ')}
    }
    
    async onSettings(oldSettings, newSettings, changedKeysArr) {
        await super.onSettings(oldSettings, newSettings, changedKeysArr);
        
        // Gestion des paramètres
        console.log('Settings updated:', changedKeysArr);
    }
}

module.exports = ${type.charAt(0).toUpperCase() + type.slice(1)}${category.charAt(0).toUpperCase() + category.slice(1)};`;
    
    fs.writeFileSync(path.join(categoryPath, 'driver.js'), driverJS);
  }

  getCapabilitiesForCategory(category) {
    const capabilities = {
      automation: ['onoff'],
      climate: ['measure_temperature', 'measure_humidity'],
      covers: ['windowcoverings_state', 'windowcoverings_set'],
      generic: ['onoff'],
      lighting: ['onoff', 'dim', 'light_temperature'],
      lights: ['onoff', 'dim', 'light_hue', 'light_saturation'],
      locks: ['lock_state'],
      plugs: ['onoff'],
      security: ['alarm_motion', 'alarm_contact'],
      sensors: ['measure_temperature', 'measure_humidity', 'measure_pressure'],
      switches: ['onoff'],
      unknown: ['onoff'],
      dimmers: ['onoff', 'dim'],
      onoff: ['onoff'],
      thermostats: ['measure_temperature', 'target_temperature']
    };
    
    return capabilities[category] || ['onoff'];
  }

  getClassForCategory(category) {
    const classes = {
      automation: 'other',
      climate: 'sensor',
      covers: 'windowcoverings',
      generic: 'other',
      lighting: 'light',
      lights: 'light',
      locks: 'lock',
      plugs: 'socket',
      security: 'sensor',
      sensors: 'sensor',
      switches: 'socket',
      unknown: 'other',
      dimmers: 'light',
      onoff: 'socket',
      thermostats: 'thermostat'
    };
    
    return classes[category] || 'other';
  }

  getZigbeeConfigForCategory(category) {
    const configs = {
      automation: {
        manufacturerName: ['Generic'],
        endpoints: {
          "1": {
            clusters: ['genOnOff', 'genBasic'],
            bindings: ['genOnOff']
          }
        },
        productId: ['']
      },
      climate: {
        manufacturerName: ['Generic'],
        endpoints: {
          "1": {
            clusters: ['msTemperatureMeasurement', 'msRelativeHumidity'],
            bindings: ['msTemperatureMeasurement']
          }
        },
        productId: ['']
      },
      covers: {
        manufacturerName: ['Generic'],
        endpoints: {
          "1": {
            clusters: ['genLevelCtrl', 'genBasic'],
            bindings: ['genLevelCtrl']
          }
        },
        productId: ['']
      },
      lighting: {
        manufacturerName: ['Generic'],
        endpoints: {
          "1": {
            clusters: ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl'],
            bindings: ['genOnOff', 'genLevelCtrl']
          }
        },
        productId: ['']
      },
      lights: {
        manufacturerName: ['Generic'],
        endpoints: {
          "1": {
            clusters: ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl'],
            bindings: ['genOnOff', 'genLevelCtrl']
          }
        },
        productId: ['']
      },
      sensors: {
        manufacturerName: ['Generic'],
        endpoints: {
          "1": {
            clusters: ['msTemperatureMeasurement', 'msRelativeHumidity'],
            bindings: ['msTemperatureMeasurement']
          }
        },
        productId: ['']
      },
      switches: {
        manufacturerName: ['Generic'],
        endpoints: {
          "1": {
            clusters: ['genOnOff', 'genBasic'],
            bindings: ['genOnOff']
          }
        },
        productId: ['']
      }
    };
    
    return configs[category] || {
      manufacturerName: ['Generic'],
      endpoints: {
        "1": {
          clusters: ['genOnOff', 'genBasic'],
          bindings: ['genOnOff']
        }
      },
      productId: ['']
    };
  }

  async cleanupOrphanFiles() {
    console.log('🗑️ Nettoyage des fichiers orphelins...');
    
    // Supprimer les anciens fichiers .js à la racine des drivers
    const tuyaPath = 'drivers/tuya';
    const zigbeePath = 'drivers/zigbee';
    
    const orphanFiles = [
      path.join(tuyaPath, 'tuya-switch.js'),
      path.join(tuyaPath, 'tuya-sensor.js'),
      path.join(tuyaPath, 'tuya-light-bulb.js'),
      path.join(zigbeePath, 'zigbee-switch.js'),
      path.join(zigbeePath, 'zigbee-sensor.js'),
      path.join(zigbeePath, 'zigbee-light-bulb.js')
    ];
    
    for (const file of orphanFiles) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log('🗑️ Fichier supprimé:', file);
      }
    }
    
    console.log('✅ Nettoyage terminé');
  }

  async validateNewStructure() {
    console.log('✅ Validation de la nouvelle structure...');
    
    const errors = [];
    
    // Vérifier que tous les dossiers existent
    for (const [type, categories] of Object.entries(this.driverStructure)) {
      for (const category of Object.keys(categories)) {
        const categoryPath = path.join('drivers', type, category);
        if (!fs.existsSync(categoryPath)) {
          errors.push(`Dossier manquant: ${categoryPath}`);
        }
        
        // Vérifier driver.compose.json
        const composePath = path.join(categoryPath, 'driver.compose.json');
        if (!fs.existsSync(composePath)) {
          errors.push(`driver.compose.json manquant: ${composePath}`);
        } else {
          try {
            JSON.parse(fs.readFileSync(composePath, 'utf8'));
          } catch (error) {
            errors.push(`driver.compose.json invalide: ${composePath}`);
          }
        }
        
        // Vérifier driver.js
        const driverPath = path.join(categoryPath, 'driver.js');
        if (!fs.existsSync(driverPath)) {
          errors.push(`driver.js manquant: ${driverPath}`);
        }
      }
    }
    
    if (errors.length > 0) {
      console.error('❌ Erreurs de validation:');
      errors.forEach(error => console.error('  -', error));
      throw new Error(`${errors.length} erreurs de validation`);
    }
    
    console.log('✅ Structure validée avec succès');
  }

  async generateReport() {
    console.log('📊 Génération du rapport...');
    
    const report = {
      timestamp: new Date().toISOString(),
      tuyaDrivers: Object.keys(this.driverStructure.tuya).length,
      zigbeeDrivers: Object.keys(this.driverStructure.zigbee).length,
      totalDrivers: Object.keys(this.driverStructure.tuya).length + Object.keys(this.driverStructure.zigbee).length,
      structure: this.driverStructure,
      backup: 'backup/drivers-' + new Date().toISOString().replace(/[:.]/g, '-')
    };
    
    const reportPath = 'reports/driver-reorganization-report.json';
    fs.mkdirSync('reports', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Rapport sauvegardé: ${reportPath}`);
    
    // Affichage du résumé
    console.log('\n📊 RÉSUMÉ REORGANIZE DRIVERS:');
    console.log(`🔧 Drivers Tuya: ${report.tuyaDrivers}`);
    console.log(`🔧 Drivers Zigbee: ${report.zigbeeDrivers}`);
    console.log(`📋 Total: ${report.totalDrivers} drivers`);
    console.log('✅ Structure réorganisée');
    console.log('✅ Validation réussie');
  }
}

// Exécution immédiate
if (require.main === module) {
  const reorganizer = new DriverReorganizer();
  reorganizer.run().then(() => {
    console.log('🎉 REORGANIZE DRIVERS TERMINÉ AVEC SUCCÈS !');
    process.exit(0);
  }).catch(error => {
    console.error('❌ ERREUR FATALE:', error);
    process.exit(1);
  });
}

module.exports = DriverReorganizer; 