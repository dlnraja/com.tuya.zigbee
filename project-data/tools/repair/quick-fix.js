#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION RAPIDE DES DRIVERS');
console.log('==================================');

// Configuration des chemins
const projectRoot = path.join(__dirname, '../..');
const driversPath = path.join(projectRoot, 'drivers');

console.log('📁 Répertoire projet:', projectRoot);
console.log('📁 Répertoire drivers:', driversPath);

// Configuration Zigbee pour chaque driver universel
const driverConfigs = {
  'fan-tuya-universal': {
    manufacturerName: '_TZ3000_1h2x4akh',
    productId: 'TS0601',
    endpoints: {
      "1": {
        clusters: {
          input: ['genBasic', 'genPowerCfg', 'genOnOff', 'genLevelCtrl', 'genFanControl'],
          output: ['genBasic', 'genPowerCfg', 'genOnOff', 'genLevelCtrl', 'genFanControl']
        },
        bindings: ['genBasic', 'genPowerCfg', 'genOnOff', 'genLevelCtrl', 'genFanControl']
      }
    }
  },
  'lock-tuya-universal': {
    manufacturerName: '_TZ3000_ltiqubue',
    productId: 'TS0601',
    endpoints: {
      "1": {
        clusters: {
          input: ['genBasic', 'genPowerCfg', 'genDoorLock', 'genAlarms', 'genTime'],
          output: ['genBasic', 'genPowerCfg', 'genDoorLock', 'genAlarms', 'genTime']
        },
        bindings: ['genBasic', 'genPowerCfg', 'genDoorLock', 'genAlarms', 'genTime']
      }
    }
  },
  'switch': {
    manufacturerName: '_TZ3000_8kzqqzu4',
    productId: 'TS0001',
    endpoints: {
      "1": {
        clusters: {
          input: ['genBasic', 'genOnOff', 'genPowerCfg'],
          output: ['genBasic', 'genOnOff', 'genPowerCfg']
        },
        bindings: ['genBasic', 'genOnOff', 'genPowerCfg']
      }
    }
  },
  'tuya-climate-universal': {
    manufacturerName: '_TZ3000_vd43bbfq',
    productId: 'TS0601',
    endpoints: {
      "1": {
        clusters: {
          input: ['genBasic', 'genPowerCfg', 'genTemperatureMeasurement', 'genHumidityMeasurement', 'genThermostat'],
          output: ['genBasic', 'genPowerCfg', 'genTemperatureMeasurement', 'genHumidityMeasurement', 'genThermostat']
        },
        bindings: ['genBasic', 'genPowerCfg', 'genTemperatureMeasurement', 'genHumidityMeasurement', 'genThermostat']
      }
    }
  },
  'tuya-cover-universal': {
    manufacturerName: '_TZ3000_4ux0ondb',
    productId: 'TS0602',
    endpoints: {
      "1": {
        clusters: {
          input: ['genBasic', 'genPowerCfg', 'genWindowCovering', 'genTime', 'genAlarms'],
          output: ['genBasic', 'genPowerCfg', 'genWindowCovering', 'genTime', 'genAlarms']
        },
        bindings: ['genBasic', 'genPowerCfg', 'genWindowCovering', 'genTime', 'genAlarms']
      }
    }
  },
  'tuya-light-universal': {
    manufacturerName: '_TZ3000_qa8s8vca',
    productId: 'TS0501B',
    endpoints: {
      "1": {
        clusters: {
          input: ['genBasic', 'genPowerCfg', 'genOnOff', 'genLevelCtrl', 'genColorCtrl', 'genScenes'],
          output: ['genBasic', 'genPowerCfg', 'genOnOff', 'genLevelCtrl', 'genColorCtrl', 'genScenes']
        },
        bindings: ['genBasic', 'genPowerCfg', 'genOnOff', 'genLevelCtrl', 'genColorCtrl', 'genScenes']
      }
    }
  },
  'tuya-plug-universal': {
    manufacturerName: '_TZ3000_b28wrpvx',
    productId: 'TS011F',
    endpoints: {
      "1": {
        clusters: {
          input: ['genBasic', 'genPowerCfg', 'genOnOff', 'genElectricalMeasurement', 'genMetering'],
          output: ['genBasic', 'genPowerCfg', 'genOnOff', 'genElectricalMeasurement', 'genMetering']
        },
        bindings: ['genBasic', 'genPowerCfg', 'genOnOff', 'genElectricalMeasurement', 'genMetering']
      }
    }
  },
  'tuya-remote-universal': {
    manufacturerName: '_TZ3000_8kzqqzu4',
    productId: 'TS0601',
    endpoints: {
      "1": {
        clusters: {
          input: ['genBasic', 'genPowerCfg', 'genScenes'],
          output: ['genBasic', 'genPowerCfg', 'genScenes']
        },
        bindings: ['genBasic', 'genPowerCfg', 'genScenes']
      }
    }
  },
  'tuya-sensor-universal': {
    manufacturerName: '_TZ3000_1h2x4akh',
    productId: 'TS0201',
    endpoints: {
      "1": {
        clusters: {
          input: ['genBasic', 'genPowerCfg', 'genTemperatureMeasurement', 'genHumidityMeasurement', 'genOccupancySensing'],
          output: ['genBasic', 'genPowerCfg', 'genTemperatureMeasurement', 'genHumidityMeasurement', 'genOccupancySensing']
        },
        bindings: ['genBasic', 'genPowerCfg', 'genTemperatureMeasurement', 'genHumidityMeasurement', 'genOccupancySensing']
      }
    }
  },
  'zigbee-tuya-universal': {
    manufacturerName: '_TZ3000_generic',
    productId: 'TS0601',
    endpoints: {
      "1": {
        clusters: {
          input: ['genBasic', 'genPowerCfg', 'genOnOff'],
          output: ['genBasic', 'genPowerCfg', 'genOnOff']
        },
        bindings: ['genBasic', 'genPowerCfg', 'genOnOff']
      }
    }
  }
};

// Corriger chaque driver
let correctedCount = 0;

for (const [driverName, zigbeeConfig] of Object.entries(driverConfigs)) {
  const driverPath = path.join(driversPath, driverName);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (fs.existsSync(composePath)) {
    try {
      const content = fs.readFileSync(composePath, 'utf8');
      const driverConfig = JSON.parse(content);
      
      // Vérifier si le driver a besoin de correction
      if (!driverConfig.zigbee || !driverConfig.zigbee.manufacturerName) {
        console.log(`🔧 Correction de ${driverName}...`);
        
        // Ajouter la configuration zigbee
        driverConfig.zigbee = zigbeeConfig;
        
        // Sauvegarder le driver corrigé
        const updatedContent = JSON.stringify(driverConfig, null, 2);
        fs.writeFileSync(composePath, updatedContent, 'utf8');
        
        correctedCount++;
        console.log(`✅ ${driverName} corrigé`);
      } else {
        console.log(`✅ ${driverName} déjà correct`);
      }
    } catch (error) {
      console.log(`❌ Erreur lors de la correction de ${driverName}: ${error.message}`);
    }
  } else {
    console.log(`⚠️  Driver ${driverName} non trouvé`);
  }
}

console.log(`\n🎯 ${correctedCount} drivers corrigés`);
console.log('🎉 Correction terminée !');
console.log('🚀 Prêt pour homey app validate');
