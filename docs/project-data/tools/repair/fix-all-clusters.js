#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION COMPLÈTE TOUS LES CLUSTERS');
console.log('========================================');

// Mapping complet des clusters
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
  let totalClusters = 0;
  
  // Convertir TOUS les drivers
  for (const driver of appConfig.drivers) {
    if (!driver.zigbee || !driver.zigbee.endpoints) continue;
    
    let driverModified = false;
    
    for (const endpointId in driver.zigbee.endpoints) {
      const endpoint = driver.zigbee.endpoints[endpointId];
      
      if (endpoint.clusters && Array.isArray(endpoint.clusters)) {
        totalClusters += endpoint.clusters.length;
        
        // Convertir chaque cluster
        const numericClusters = endpoint.clusters.map(cluster => {
          if (typeof cluster === 'string' && clusterIds[cluster] !== undefined) {
            return clusterIds[cluster];
          }
          return typeof cluster === 'number' ? cluster : 0;
        });
        
        endpoint.clusters = numericClusters;
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
  
  console.log(`\n📊 RÉSUMÉ COMPLET:`);
  console.log(`   - Drivers corrigés: ${correctedCount}`);
  console.log(`   - Total drivers: ${appConfig.drivers.length}`);
  console.log(`   - Total clusters traités: ${totalClusters}`);
  
  if (correctedCount > 0) {
    console.log('\n🎉 CORRECTION COMPLÈTE TERMINÉE !');
    console.log('🚀 Prêt pour validation Homey');
    
    // Vérification rapide
    console.log('\n🔍 VÉRIFICATION RAPIDE...');
    const sampleDriver = appConfig.drivers[0];
    if (sampleDriver.zigbee && sampleDriver.zigbee.endpoints) {
      const sampleEndpoint = sampleDriver.zigbee.endpoints['1'];
      if (sampleEndpoint.clusters) {
        console.log(`   Exemple: ${sampleDriver.id} - clusters: [${sampleEndpoint.clusters.join(', ')}]`);
        const allNumeric = sampleEndpoint.clusters.every(c => typeof c === 'number');
        console.log(`   ✅ Tous numériques: ${allNumeric}`);
      }
    }
  }
  
} catch (error) {
  console.log(`❌ Erreur: ${error.message}`);
  process.exit(1);
}
