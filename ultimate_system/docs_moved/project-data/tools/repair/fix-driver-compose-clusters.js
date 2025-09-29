#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION CLUSTERS DANS DRIVER.COMPOSE.JSON');
console.log('===============================================');

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

// Chemin vers le dossier drivers
const driversPath = path.join(__dirname, '../../drivers');

try {
  // Lire tous les dossiers de drivers
  const driverDirs = fs.readdirSync(driversPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`📂 Trouvé ${driverDirs.length} dossiers de drivers`);

  let correctedCount = 0;
  let totalFiles = 0;

  // Traiter chaque driver
  for (const driverDir of driverDirs) {
    const driverComposePath = path.join(driversPath, driverDir, 'driver.compose.json');
    
    if (!fs.existsSync(driverComposePath)) {
      console.log(`⚠️  ${driverDir}: driver.compose.json manquant`);
      continue;
    }

    totalFiles++;
    let fileModified = false;

    try {
      // Lire le fichier
      const content = fs.readFileSync(driverComposePath, 'utf8');
      const driverConfig = JSON.parse(content);

      // Vérifier et corriger les clusters
      if (driverConfig.zigbee && driverConfig.zigbee.endpoints) {
        for (const endpointId in driverConfig.zigbee.endpoints) {
          const endpoint = driverConfig.zigbee.endpoints[endpointId];
          
          if (endpoint.clusters && Array.isArray(endpoint.clusters)) {
            // Convertir chaque cluster
            const numericClusters = endpoint.clusters.map(cluster => {
              if (typeof cluster === 'string' && clusterIds[cluster] !== undefined) {
                return clusterIds[cluster];
              }
              return typeof cluster === 'number' ? cluster : 0;
            });
            
            // Vérifier si changement nécessaire
            if (JSON.stringify(endpoint.clusters) !== JSON.stringify(numericClusters)) {
              endpoint.clusters = numericClusters;
              fileModified = true;
            }
          }
        }
      }

      // Sauvegarder si modifié
      if (fileModified) {
        const updatedContent = JSON.stringify(driverConfig, null, 2);
        fs.writeFileSync(driverComposePath, updatedContent, 'utf8');
        correctedCount++;
        console.log(`✅ ${driverDir} - clusters convertis`);
      }

    } catch (error) {
      console.log(`❌ ${driverDir}: Erreur - ${error.message}`);
    }
  }

  console.log(`\n📊 RÉSUMÉ:`);
  console.log(`   - Fichiers traités: ${totalFiles}`);
  console.log(`   - Fichiers corrigés: ${correctedCount}`);
  
  if (correctedCount > 0) {
    console.log('\n🎉 CORRECTION TERMINÉE !');
    console.log('🚀 Prêt pour régénération de app.json');
    
    // Instructions
    console.log('\n📋 PROCHAINES ÉTAPES:');
    console.log('   1. Supprimer app.json existant');
    console.log('   2. Exécuter homey app validate pour régénérer');
    console.log('   3. Vérifier que les clusters sont numériques');
  } else {
    console.log('\n✅ Aucune correction nécessaire');
  }

} catch (error) {
  console.log(`❌ Erreur générale: ${error.message}`);
  process.exit(1);
}
