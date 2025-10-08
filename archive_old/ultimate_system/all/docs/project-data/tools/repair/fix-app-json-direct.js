#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Correction directe du fichier app.json...');

// Lire le fichier app.json
const appJsonPath = path.join(__dirname, '../../app.json');
let appJson;

try {
  appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
} catch (error) {
  console.error('❌ Erreur lors de la lecture du fichier app.json:', error.message);
  process.exit(1);
}

// Corriger la propriété platforms
appJson.platforms = "local";
console.log('✅ Propriété "platforms" corrigée en "local"');

// Configuration Zigbee pour chaque driver
const zigbeeConfigs = {
  'fan-tuya-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0601_fan',
    endpoints: [
      {
        "ID": 1,
        "clusters": ["genBasic", "genPowerCfg", "genOnOff", "genLevelCtrl"],
        "bindings": ["genOnOff", "genLevelCtrl"]
      }
    ]
  },
  'lock-tuya-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0601_lock',
    endpoints: [
      {
        "ID": 1,
        "clusters": ["genBasic", "genPowerCfg", "genOnOff", "genDoorLock"],
        "bindings": ["genOnOff", "genDoorLock"]
      }
    ]
  },
  'switch': {
    manufacturerName: 'Tuya',
    productId: 'TS011F_switch',
    endpoints: [
      {
        "ID": 1,
        "clusters": ["genBasic", "genPowerCfg", "genOnOff"],
        "bindings": ["genOnOff"]
      }
    ]
  },
  'tuya-climate-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0601_trv',
    endpoints: [
      {
        "ID": 1,
        "clusters": ["genBasic", "genPowerCfg", "genThermostat", "genHumidity"],
        "bindings": ["genThermostat", "genHumidity"]
      }
    ]
  },
  'tuya-cover-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0601_cover',
    endpoints: [
      {
        "ID": 1,
        "clusters": ["genBasic", "genPowerCfg", "genWindowCovering"],
        "bindings": ["genWindowCovering"]
      }
    ]
  },
  'tuya-light-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0501B_light',
    endpoints: [
      {
        "ID": 1,
        "clusters": ["genBasic", "genPowerCfg", "genOnOff", "genLevelCtrl", "genColorCtrl"],
        "bindings": ["genOnOff", "genLevelCtrl", "genColorCtrl"]
      }
    ]
  },
  'tuya-plug-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS011F_plug',
    endpoints: [
      {
        "ID": 1,
        "clusters": ["genBasic", "genPowerCfg", "genOnOff", "genElectricalMeasurement"],
        "bindings": ["genOnOff", "genElectricalMeasurement"]
      }
    ]
  },
  'tuya-remote-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0041_remote',
    endpoints: [
      {
        "ID": 1,
        "clusters": ["genBasic", "genPowerCfg", "genOnOff"],
        "bindings": ["genOnOff"]
      }
    ]
  },
  'tuya-sensor-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS0201_sensor',
    endpoints: [
      {
        "ID": 1,
        "clusters": ["genBasic", "genPowerCfg", "genTemperatureMeasurement", "genHumidityMeasurement"],
        "bindings": ["genTemperatureMeasurement", "genHumidityMeasurement"]
      }
    ]
  },
  'zigbee-tuya-universal': {
    manufacturerName: 'Tuya',
    productId: 'TS011F_switch',
    endpoints: [
      {
        "ID": 1,
        "clusters": ["genBasic", "genPowerCfg", "genOnOff"],
        "bindings": ["genOnOff"]
      }
    ]
  }
};

// Appliquer les corrections aux drivers
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
  }
});

// Sauvegarder le fichier corrigé
try {
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');
  console.log('✅ Fichier app.json corrigé avec succès !');
  console.log(`📊 Résumé: ${driversFixed}/10 drivers corrigés`);
} catch (error) {
  console.error('❌ Erreur lors de l\'écriture du fichier app.json:', error.message);
  process.exit(1);
}

console.log('🚀 Le fichier app.json est maintenant prêt pour la validation Homey !');
