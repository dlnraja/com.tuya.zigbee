#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Correction du fichier app.json...');

// Lire le fichier app.json
const appJsonPath = path.join(__dirname, '../../app.json');
let appJson;

try {
  appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
} catch (error) {
  console.error('❌ Erreur lors de la lecture du fichier app.json:', error.message);
  process.exit(1);
}

// Ajouter les propriétés manquantes au niveau racine
if (!appJson.name) {
  appJson.name = "Tuya Zigbee (Lite)";
  console.log('✅ Ajout de la propriété "name"');
}

if (!appJson.author) {
  appJson.author = {
    name: "Dylan Rajasekaram",
    email: "[redacted-email]"
  };
  console.log('✅ Ajout de la propriété "author"');
}

// Configuration des propriétés Zigbee pour chaque driver
const zigbeeConfigs = {
  'fan-tuya-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0601_fan',
    endpoints: {
      '1': {
        clusters: ['genBasic', 'genPowerCfg', 'genOnOff', 'genLevelCtrl'],
        bindings: ['genOnOff', 'genLevelCtrl']
      }
    }
  },
  'lock-tuya-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0601_lock',
    endpoints: {
      '1': {
        clusters: ['genBasic', 'genPowerCfg', 'genDoorLock'],
        bindings: ['genDoorLock']
      }
    }
  },
  'switch': {
    manufacturerName: 'Tuya',
    productId: 'TS011F_switch',
    endpoints: {
      '1': {
        clusters: ['genBasic', 'genOnOff'],
        bindings: ['genOnOff']
      }
    }
  },
  'tuya-climate-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0601_trv',
    endpoints: {
      '1': {
        clusters: ['genBasic', 'genPowerCfg', 'genThermostat', 'genHumidity'],
        bindings: ['genThermostat', 'genHumidity']
      }
    }
  },
  'tuya-cover-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0601_cover',
    endpoints: {
      '1': {
        clusters: ['genBasic', 'genPowerCfg', 'genWindowCovering'],
        bindings: ['genWindowCovering']
      }
    }
  },
  'tuya-light-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0501B_light',
    endpoints: {
      '1': {
        clusters: ['genBasic', 'genPowerCfg', 'genOnOff', 'genLevelCtrl', 'genColorCtrl'],
        bindings: ['genOnOff', 'genLevelCtrl', 'genColorCtrl']
      }
    }
  },
  'tuya-plug-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS011F_plug',
    endpoints: {
      '1': {
        clusters: ['genBasic', 'genPowerCfg', 'genOnOff', 'genElectricalMeasurement'],
        bindings: ['genOnOff', 'genElectricalMeasurement']
      }
    }
  },
  'tuya-remote-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0041_remote',
    endpoints: {
      '1': {
        clusters: ['genBasic', 'genPowerCfg', 'genOnOff'],
        bindings: ['genOnOff']
      }
    }
  },
  'tuya-sensor-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0201_sensor',
    endpoints: {
      '1': {
        clusters: ['genBasic', 'genPowerCfg', 'genTemperatureMeasurement', 'genHumidityMeasurement'],
        bindings: ['genTemperatureMeasurement', 'genHumidityMeasurement']
      }
    }
  },
  'zigbee-tuya-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS011F_switch',
    endpoints: {
      '1': {
        clusters: ['genBasic', 'genPowerCfg', 'genOnOff'],
        bindings: ['genOnOff']
      }
    }
  }
};

// Appliquer les corrections aux drivers
let driversFixed = 0;
appJson.drivers.forEach(driver => {
  if (zigbeeConfigs[driver.id]) {
    const config = zigbeeConfigs[driver.id];
    
    // Ajouter les propriétés Zigbee manquantes
    if (!driver.zigbee.manufacturerName) {
      driver.zigbee.manufacturerName = config.manufacturerName;
    }
    if (!driver.zigbee.productId) {
      driver.zigbee.productId = config.productId;
    }
    if (!driver.zigbee.endpoints) {
      driver.zigbee.endpoints = config.endpoints;
    }
    
    driversFixed++;
    console.log(`✅ Driver ${driver.id} corrigé`);
  }
});

// Sauvegarder le fichier corrigé
try {
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  console.log(`\n🎯 Correction terminée !`);
  console.log(`📊 Résumé:`);
  console.log(`   - Propriétés racine ajoutées: ${appJson.name ? 'OUI' : 'NON'}, ${appJson.author ? 'OUI' : 'NON'}`);
  console.log(`   - Drivers corrigés: ${driversFixed}/${appJson.drivers.length}`);
  console.log(`   - Fichier sauvegardé: ${appJsonPath}`);
} catch (error) {
  console.error('❌ Erreur lors de la sauvegarde:', error.message);
  process.exit(1);
}

console.log('\n🚀 Le fichier app.json est maintenant prêt pour la validation Homey !');
