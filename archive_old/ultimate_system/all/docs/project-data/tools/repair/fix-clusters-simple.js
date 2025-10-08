#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CONVERSION CLUSTERS SIMPLE');
console.log('=============================');

// Mapping des clusters
const clusterIds = {
  'genBasic': 0,
  'genPowerCfg': 1,
  'genOnOff': 6,
  'genLevelCtrl': 8,
  'genScenes': 5,
  'genGroups': 4,
  'genAlarms': 9,
  'genTime': 10,
  'genElectricalMeasurement': 2820,
  'genMetering': 1794,
  'genTemperatureMeasurement': 1026,
  'genHumidityMeasurement': 1029,
  'genOccupancySensing': 1030,
  'genColorCtrl': 768,
  'genFanControl': 514,
  'genDoorLock': 257,
  'genThermostat': 513,
  'genWindowCovering': 258
};

// Lire app.json
const appJsonPath = path.join(__dirname, '../../app.json');
console.log('📂 Lecture de app.json...');

try {
  const content = fs.readFileSync(appJsonPath, 'utf8');
  const appConfig = JSON.parse(content);
  
  if (!appConfig.drivers || !Array.isArray(appConfig.drivers)) {
    console.log('❌ Aucun driver trouvé !');
    process.exit(1);
  }
  
  console.log(`📊 Trouvé ${appConfig.drivers.length} drivers`);
  
  let correctedCount = 0;
  
  // Convertir tous les drivers
  for (const driver of appConfig.drivers) {
    if (!driver.zigbee || !driver.zigbee.endpoints) continue;
    
    let driverModified = false;
    
    for (const endpointId in driver.zigbee.endpoints) {
      const endpoint = driver.zigbee.endpoints[endpointId];
      
      if (endpoint.clusters && Array.isArray(endpoint.clusters)) {
        // Convertir chaque cluster
        endpoint.clusters = endpoint.clusters.map(cluster => {
          if (typeof cluster === 'string' && clusterIds[cluster] !== undefined) {
            return clusterIds[cluster];
          }
          return typeof cluster === 'number' ? cluster : 0;
        });
        
        driverModified = true;
      }
    }
    
    if (driverModified) {
      correctedCount++;
      console.log(`✅ ${driver.id} - clusters convertis`);
    }
  }
  
  // Sauvegarder
  const updatedContent = JSON.stringify(appConfig, null, 2);
  fs.writeFileSync(appJsonPath, updatedContent, 'utf8');
  
  console.log(`\n📊 RÉSUMÉ:`);
  console.log(`   - Drivers corrigés: ${correctedCount}`);
  console.log(`   - Total: ${appConfig.drivers.length}`);
  
  if (correctedCount > 0) {
    console.log('\n🎉 Conversion terminée !');
    console.log('🚀 Prêt pour validation Homey');
  }
  
} catch (error) {
  console.log(`❌ Erreur: ${error.message}`);
  process.exit(1);
}
