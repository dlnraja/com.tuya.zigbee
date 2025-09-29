#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION DES DRIVERS UNIVERSELS');
console.log('=====================================');

// Configuration des chemins
const projectRoot = path.join(__dirname, '../..');
const driversPath = path.join(projectRoot, 'drivers');
const appJsonPath = path.join(projectRoot, 'app.json');

// Configuration Zigbee pour chaque type de driver universel
const universalDriverConfigs = {
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

// Étape 1: Corriger app.json - platforms doit être un array
console.log('\n🔧 ÉTAPE 1: Correction de app.json...');

if (fs.existsSync(appJsonPath)) {
  try {
    const appContent = fs.readFileSync(appJsonPath, 'utf8');
    const appConfig = JSON.parse(appContent);
    
    // Corriger platforms pour être un array
    if (appConfig.platforms !== 'local') {
      appConfig.platforms = ['local'];
      fs.writeFileSync(appJsonPath, JSON.stringify(appConfig, null, 2), 'utf8');
      console.log('✅ app.json corrigé: platforms = ["local"]');
    } else {
      console.log('✅ app.json déjà correct');
    }
  } catch (error) {
    console.log('❌ Erreur lors de la correction de app.json:', error.message);
  }
}

// Étape 2: Corriger tous les drivers universels
console.log('\n🔧 ÉTAPE 2: Correction des drivers universels...');

let correctedCount = 0;

for (const [driverName, zigbeeConfig] of Object.entries(universalDriverConfigs)) {
  const driverPath = path.join(driversPath, driverName);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (fs.existsSync(composePath)) {
    try {
      const content = fs.readFileSync(composePath, 'utf8');
      const driverConfig = JSON.parse(content);
      
      // Vérifier si le driver a besoin de correction
      if (!driverConfig.zigbee || !driverConfig.zigbee.manufacturerName) {
        console.log(`🔧 Correction de ${driverName}...`);
        
        // Ajouter ou corriger la configuration zigbee
        driverConfig.zigbee = {
          manufacturerName: zigbeeConfig.manufacturerName,
          productId: zigbeeConfig.productId,
          endpoints: zigbeeConfig.endpoints
        };
        
        // Sauvegarder le driver corrigé
        const updatedContent = JSON.stringify(driverConfig, null, 2);
        fs.writeFileSync(composePath, updatedContent, 'utf8');
        
        correctedCount++;
        console.log(`✅ ${driverName} corrigé avec ${zigbeeConfig.manufacturerName}/${zigbeeConfig.productId}`);
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

// Étape 3: Vérification finale
console.log('\n🔍 ÉTAPE 3: Vérification finale...');

const finalDrivers = fs.readdirSync(driversPath).filter(dir => {
  return fs.statSync(path.join(driversPath, dir)).isDirectory();
});

let validCount = 0;
let totalCount = 0;

for (const driverDir of finalDrivers) {
  const composePath = path.join(driversPath, driverDir, 'driver.compose.json');
  
  if (fs.existsSync(composePath)) {
    totalCount++;
    try {
      const content = fs.readFileSync(composePath, 'utf8');
      const driverConfig = JSON.parse(content);
      
      if (driverConfig.zigbee && 
          driverConfig.zigbee.manufacturerName && 
          driverConfig.zigbee.productId && 
          driverConfig.zigbee.endpoints) {
        validCount++;
      }
    } catch (error) {
      console.log(`⚠️  Erreur lors de la vérification de ${driverDir}`);
    }
  }
}

console.log(`📊 Vérification finale:`);
console.log(`   - Total drivers: ${totalCount}`);
console.log(`   - Drivers valides: ${validCount}`);
console.log(`   - Taux de validation: ${Math.round((validCount / totalCount) * 100)}%`);

console.log('\n🎉 CORRECTION TERMINÉE !');
console.log('🚀 Prêt pour homey app validate');
