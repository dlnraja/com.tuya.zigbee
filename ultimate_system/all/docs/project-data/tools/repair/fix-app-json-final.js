#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Script de correction finale pour app.json');
console.log('==========================================');

// Chemin vers app.json
const appJsonPath = path.join(__dirname, '../../app.json');

// Vérifier que le fichier existe
if (!fs.existsSync(appJsonPath)) {
  console.error('❌ Fichier app.json non trouvé');
  process.exit(1);
}

// Lire le fichier app.json
let appJson;
try {
  const content = fs.readFileSync(appJsonPath, 'utf8');
  appJson = JSON.parse(content);
  console.log('✅ Fichier app.json lu avec succès');
} catch (error) {
  console.error('❌ Erreur lors de la lecture du fichier app.json:', error.message);
  process.exit(1);
}

// Configuration Zigbee correcte pour chaque driver
const zigbeeConfigs = {
  'fan-tuya-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0601_fan',
    endpoints: [
      {
        ID: 1,
        clusters: {
          input: ['genBasic', 'genPowerCfg', 'genOnOff', 'genLevelCtrl'],
          output: ['genBasic', 'genPowerCfg', 'genOnOff', 'genLevelCtrl']
        },
        bindings: ['genBasic', 'genPowerCfg', 'genOnOff', 'genLevelCtrl']
      }
    ]
  },
  'lock-tuya-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0601_lock',
    endpoints: [
      {
        ID: 1,
        clusters: {
          input: ['genBasic', 'genPowerCfg', 'genDoorLock'],
          output: ['genBasic', 'genPowerCfg', 'genDoorLock']
        },
        bindings: ['genBasic', 'genPowerCfg', 'genDoorLock']
      }
    ]
  },
  'switch': {
    manufacturerName: 'Tuya',
    productId: 'TS011F_switch',
    endpoints: [
      {
        ID: 1,
        clusters: {
          input: ['genBasic', 'genOnOff', 'genElectricalMeasurement'],
          output: ['genBasic', 'genOnOff', 'genElectricalMeasurement']
        },
        bindings: ['genBasic', 'genOnOff', 'genElectricalMeasurement']
      }
    ]
  },
  'tuya-climate-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0601_trv',
    endpoints: [
      {
        ID: 1,
        clusters: {
          input: ['genBasic', 'genPowerCfg', 'genHumidityMeasurement', 'genTemperatureMeasurement'],
          output: ['genBasic', 'genPowerCfg', 'genHumidityMeasurement', 'genTemperatureMeasurement']
        },
        bindings: ['genBasic', 'genPowerCfg', 'genHumidityMeasurement', 'genTemperatureMeasurement']
      }
    ]
  },
  'tuya-cover-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0601_cover',
    endpoints: [
      {
        ID: 1,
        clusters: {
          input: ['genBasic', 'genPowerCfg', 'genWindowCovering'],
          output: ['genBasic', 'genPowerCfg', 'genWindowCovering']
        },
        bindings: ['genBasic', 'genPowerCfg', 'genWindowCovering']
      }
    ]
  },
  'tuya-light-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0501B_light',
    endpoints: [
      {
        ID: 1,
        clusters: {
          input: ['genBasic', 'genPowerCfg', 'genOnOff', 'genLevelCtrl', 'genColorCtrl'],
          output: ['genBasic', 'genPowerCfg', 'genOnOff', 'genLevelCtrl', 'genColorCtrl']
        },
        bindings: ['genBasic', 'genPowerCfg', 'genOnOff', 'genLevelCtrl', 'genColorCtrl']
      }
    ]
  },
  'tuya-plug-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS011F_plug',
    endpoints: [
      {
        ID: 1,
        clusters: {
          input: ['genBasic', 'genPowerCfg', 'genOnOff', 'genElectricalMeasurement'],
          output: ['genBasic', 'genPowerCfg', 'genOnOff', 'genElectricalMeasurement']
        },
        bindings: ['genBasic', 'genPowerCfg', 'genOnOff', 'genElectricalMeasurement']
      }
    ]
  },
  'tuya-remote-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0041_remote',
    endpoints: [
      {
        ID: 1,
        clusters: {
          input: ['genBasic', 'genPowerCfg'],
          output: ['genBasic', 'genPowerCfg']
        },
        bindings: ['genBasic', 'genPowerCfg']
      }
    ]
  },
  'tuya-sensor-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0201_sensor',
    endpoints: [
      {
        ID: 1,
        clusters: {
          input: ['genBasic', 'genPowerCfg', 'genTemperatureMeasurement', 'genHumidityMeasurement'],
          output: ['genBasic', 'genPowerCfg', 'genTemperatureMeasurement', 'genHumidityMeasurement']
        },
        bindings: ['genBasic', 'genPowerCfg', 'genTemperatureMeasurement', 'genHumidityMeasurement']
      }
    ]
  },
  'zigbee-tuya-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS011F_universal',
    endpoints: [
      {
        ID: 1,
        clusters: {
          input: ['genBasic', 'genPowerCfg', 'genOnOff'],
          output: ['genBasic', 'genPowerCfg', 'genOnOff']
        },
        bindings: ['genBasic', 'genPowerCfg', 'genOnOff']
      }
    ]
  }
};

// CORRECTION 1: Propriété platforms doit être un tableau
console.log('\n🔧 Correction 1: Propriété platforms');
if (typeof appJson.platforms === 'string') {
  appJson.platforms = [appJson.platforms];
  console.log('✅ Propriété "platforms" convertie en tableau');
} else if (!Array.isArray(appJson.platforms)) {
  appJson.platforms = ['local'];
  console.log('✅ Propriété "platforms" définie comme tableau ["local"]');
}

// CORRECTION 2: Propriétés zigbee pour tous les drivers
console.log('\n🔧 Correction 2: Propriétés zigbee des drivers');
let driversFixed = 0;

appJson.drivers.forEach(driver => {
  if (zigbeeConfigs[driver.id]) {
    const config = zigbeeConfigs[driver.id];
    
    // Remplacer complètement la propriété zigbee
    driver.zigbee = {
      manufacturerName: config.manufacturerName,
      productId: config.productId,
      endpoints: config.endpoints
    };
    
    driversFixed++;
    console.log(`✅ Driver ${driver.id} corrigé avec la structure Zigbee complète`);
  } else {
    console.log(`⚠️  Driver ${driver.id} non trouvé dans la configuration`);
  }
});

// Sauvegarder le fichier corrigé
try {
  const correctedContent = JSON.stringify(appJson, null, 2);
  fs.writeFileSync(appJsonPath, correctedContent, 'utf8');
  console.log(`\n🎉 Fichier app.json corrigé avec succès !`);
  console.log(`📊 Résumé des corrections:`);
  console.log(`   - Platforms: ${JSON.stringify(appJson.platforms)}`);
  console.log(`   - Drivers corrigés: ${driversFixed}/${appJson.drivers.length}`);
  console.log(`   - Fichier sauvegardé: ${appJsonPath}`);
} catch (error) {
  console.error('❌ Erreur lors de la sauvegarde:', error.message);
  process.exit(1);
}

console.log('\n✅ Correction terminée avec succès !');
console.log('🚀 Vous pouvez maintenant exécuter "homey app validate"');
