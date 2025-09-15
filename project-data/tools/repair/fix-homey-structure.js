#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION STRUCTURE HOMEY ZIGBEE');
console.log('====================================');

// Configuration des chemins
const projectRoot = path.join(__dirname, '../..');
const driversPath = path.join(projectRoot, 'drivers');

// Mapping des clusters vers des IDs numériques Zigbee standard
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

// Fonction pour corriger la structure d'un driver
function fixDriverStructure(driverConfig) {
  if (!driverConfig.zigbee || !driverConfig.zigbee.endpoints) {
    return false;
  }

  let modified = false;

  for (const endpointId in driverConfig.zigbee.endpoints) {
    const endpoint = driverConfig.zigbee.endpoints[endpointId];
    
    // Corriger la structure des clusters
    if (endpoint.clusters && typeof endpoint.clusters === 'object' && endpoint.clusters.input) {
      // Fusionner input et output en un seul array
      const allClusters = [...(endpoint.clusters.input || []), ...(endpoint.clusters.output || [])];
      const uniqueClusters = [...new Set(allClusters)]; // Supprimer les doublons
      
      endpoint.clusters = uniqueClusters;
      modified = true;
    }
    
    // Corriger les bindings - convertir en IDs numériques
    if (endpoint.bindings && Array.isArray(endpoint.bindings)) {
      const numericBindings = endpoint.bindings.map(binding => {
        if (typeof binding === 'string' && clusterIds[binding] !== undefined) {
          return clusterIds[binding];
        }
        return typeof binding === 'number' ? binding : 0;
      });
      
      endpoint.bindings = numericBindings;
      modified = true;
    }
  }

  return modified;
}

// Analyser tous les drivers
const driverDirs = fs.readdirSync(driversPath).filter(dir => {
  return fs.statSync(path.join(driversPath, dir)).isDirectory();
});

console.log(`📊 Trouvé ${driverDirs.length} dossiers de drivers`);

let correctedCount = 0;
let errorCount = 0;

for (const driverDir of driverDirs) {
  const driverPath = path.join(driversPath, driverDir);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (fs.existsSync(composePath)) {
    try {
      const content = fs.readFileSync(composePath, 'utf8');
      const driverConfig = JSON.parse(content);
      
      console.log(`🔧 Traitement de ${driverDir}...`);
      
      if (fixDriverStructure(driverConfig)) {
        // Sauvegarder le driver corrigé
        const updatedContent = JSON.stringify(driverConfig, null, 2);
        fs.writeFileSync(composePath, updatedContent, 'utf8');
        
        correctedCount++;
        console.log(`✅ ${driverDir} corrigé`);
      } else {
        console.log(`✅ ${driverDir} déjà correct`);
      }
    } catch (error) {
      console.log(`❌ Erreur lors du traitement de ${driverDir}: ${error.message}`);
      errorCount++;
    }
  } else {
    console.log(`⚠️  ${driverDir}: driver.compose.json manquant`);
  }
}

console.log(`\n📊 RÉSUMÉ:`);
console.log(`   - Drivers corrigés: ${correctedCount}`);
console.log(`   - Erreurs: ${errorCount}`);
console.log(`   - Total traité: ${driverDirs.length}`);

if (correctedCount > 0) {
  console.log('\n🎉 Correction terminée !');
  console.log('🚀 Prêt pour homey app validate');
} else {
  console.log('\n⚠️  Aucune correction nécessaire');
}