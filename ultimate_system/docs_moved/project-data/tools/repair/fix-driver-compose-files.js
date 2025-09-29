#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Script de correction des fichiers driver.compose.json');
console.log('================================================');

const driversDir = path.join(__dirname, '../../drivers');

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

// Parcourir tous les dossiers de drivers
const driverDirs = fs.readdirSync(driversDir).filter(dir => {
  return fs.statSync(path.join(driversDir, dir)).isDirectory();
});

console.log(`📁 Trouvé ${driverDirs.length} dossiers de drivers`);

let fixedCount = 0;
let errors = 0;

for (const driverDir of driverDirs) {
  const driverPath = path.join(driversDir, driverDir);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.log(`⚠️  Fichier driver.compose.json non trouvé pour ${driverDir}`);
    continue;
  }
  
  try {
    // Lire le fichier
    const content = fs.readFileSync(composePath, 'utf8');
    const driverConfig = JSON.parse(content);
    
    // Vérifier si nous avons une configuration pour ce driver
    if (zigbeeConfigs[driverDir]) {
      const config = zigbeeConfigs[driverDir];
      
      // Remplacer complètement la propriété zigbee
      driverConfig.zigbee = {
        manufacturerName: config.manufacturerName,
        productId: config.productId,
        endpoints: config.endpoints
      };
      
      // Sauvegarder le fichier
      const updatedContent = JSON.stringify(driverConfig, null, 2);
      fs.writeFileSync(composePath, updatedContent, 'utf8');
      
      console.log(`✅ Driver ${driverDir} corrigé`);
      fixedCount++;
    } else {
      console.log(`⚠️  Aucune configuration trouvée pour ${driverDir}`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors du traitement de ${driverDir}:`, error.message);
    errors++;
  }
}

console.log(`\n🎉 Correction terminée !`);
console.log(`📊 Résumé:`);
console.log(`   - Drivers corrigés: ${fixedCount}`);
console.log(`   - Erreurs: ${errors}`);
console.log(`   - Total traité: ${driverDirs.length}`);

if (fixedCount > 0) {
  console.log('\n🚀 Vous pouvez maintenant exécuter "homey app validate"');
}
