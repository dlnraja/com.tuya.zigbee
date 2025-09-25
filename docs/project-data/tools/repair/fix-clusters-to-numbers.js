#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CONVERSION CLUSTERS VERS NUMÉROS');
console.log('===================================');

// Mapping des clusters vers des IDs numériques Zigbee standard
const clusterIds = {
  'genBasic': 0,
  'genPowerCfg': 1,
  'genDeviceTemperatureConfiguration': 2,
  'genIdentify': 3,
  'genGroups': 4,
  'genScenes': 5,
  'genOnOff': 6,
  'genOnOffSwitchConfiguration': 7,
  'genLevelCtrl': 8,
  'genAlarms': 9,
  'genTime': 10,
  'genRSSILocation': 11,
  'genAnalogInput': 12,
  'genAnalogOutput': 13,
  'genAnalogValue': 14,
  'genBinaryInput': 15,
  'genBinaryOutput': 16,
  'genBinaryValue': 17,
  'genMultistateInput': 18,
  'genMultistateOutput': 19,
  'genMultistateValue': 20,
  'genCommissioning': 21,
  'genPartition': 22,
  'genOta': 25,
  'genPowerProfile': 26,
  'genApplianceControl': 27,
  'genPollCtrl': 32,
  'genShadeConfig': 256,
  'genDoorLock': 257,
  'genWindowCovering': 258,
  'genPumpConfigurationAndControl': 512,
  'genThermostat': 513,
  'genFanControl': 514,
  'genDehumidificationControl': 515,
  'genThermostatUi': 516,
  'genColorCtrl': 768,
  'genBallastConfiguration': 769,
  'genIlluminanceMeasurement': 1024,
  'genIlluminanceLevelSensing': 1025,
  'genTemperatureMeasurement': 1026,
  'genPressureMeasurement': 1027,
  'genFlowMeasurement': 1028,
  'genHumidityMeasurement': 1029,
  'genOccupancySensing': 1030,
  'genCarbonMonoxideMeasurement': 1036,
  'genCarbonDioxideMeasurement': 1037,
  'genEthyleneConcentrationMeasurement': 1038,
  'genEthyleneOxideConcentrationMeasurement': 1039,
  'genHydrogenConcentrationMeasurement': 1040,
  'genHydrogenSulphideConcentrationMeasurement': 1041,
  'genNitricOxideConcentrationMeasurement': 1042,
  'genNitrogenDioxideConcentrationMeasurement': 1043,
  'genOxygenConcentrationMeasurement': 1044,
  'genOzoneConcentrationMeasurement': 1045,
  'genSulfurDioxideConcentrationMeasurement': 1046,
  'genDissolvedOxygenConcentrationMeasurement': 1047,
  'genBromateConcentrationMeasurement': 1048,
  'genChloraminesConcentrationMeasurement': 1049,
  'genChlorineConcentrationMeasurement': 1050,
  'genFecalColiformAndEColiConcentrationMeasurement': 1051,
  'genFluorideConcentrationMeasurement': 1052,
  'genHaloaceticAcidsConcentrationMeasurement': 1053,
  'genTotalTrihalomethanesConcentrationMeasurement': 1054,
  'genTotalColiformBacteriaConcentrationMeasurement': 1055,
  'genTurbidityMeasurement': 1056,
  'genCopperConcentrationMeasurement': 1057,
  'genLeadConcentrationMeasurement': 1058,
  'genManganeseConcentrationMeasurement': 1059,
  'genSulfateConcentrationMeasurement': 1060,
  'genBromodichloromethaneConcentrationMeasurement': 1061,
  'genBromoformConcentrationMeasurement': 1062,
  'genChlorodibromomethaneConcentrationMeasurement': 1063,
  'genChloroformConcentrationMeasurement': 1064,
  'genSodiumConcentrationMeasurement': 1065,
  'genIasZone': 1280,
  'genIasWd': 1281,
  'genMetering': 1794,
  'genElectricalMeasurement': 2820,
  'genDiagnostics': 2821,
  'touchlink': 4096,
  'manuSpecificCluster': 0xFC00,
  'manuSpecificClusterAduroSmart': 0xFCCC
};

const projectRoot = process.cwd();
const appJsonPath = path.join(projectRoot, 'app.json');

console.log(`📂 Lecture de app.json...`);

if (!fs.existsSync(appJsonPath)) {
  console.log('❌ app.json non trouvé !');
  process.exit(1);
}

try {
  const content = fs.readFileSync(appJsonPath, 'utf8');
  const appConfig = JSON.parse(content);
  
  if (!appConfig.drivers || !Array.isArray(appConfig.drivers)) {
    console.log('❌ Aucun driver trouvé dans app.json !');
    process.exit(1);
  }
  
  console.log(`📊 Trouvé ${appConfig.drivers.length} drivers`);
  
  let correctedCount = 0;
  
  for (const driver of appConfig.drivers) {
    if (!driver.zigbee || !driver.zigbee.endpoints) {
      continue;
    }
    
    let driverModified = false;
    
    for (const endpointId in driver.zigbee.endpoints) {
      const endpoint = driver.zigbee.endpoints[endpointId];
      
      // Convertir les clusters de strings vers nombres
      if (endpoint.clusters && Array.isArray(endpoint.clusters)) {
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
  
  // Sauvegarder le fichier corrigé
  const updatedContent = JSON.stringify(appConfig, null, 2);
  fs.writeFileSync(appJsonPath, updatedContent, 'utf8');
  
  console.log(`\n📊 RÉSUMÉ:`);
  console.log(`   - Drivers corrigés: ${correctedCount}`);
  console.log(`   - Total drivers: ${appConfig.drivers.length}`);
  
  if (correctedCount > 0) {
    console.log('\n🎉 Conversion terminée !');
    console.log('🚀 Prêt pour homey app validate');
  } else {
    console.log('\n⚠️  Aucune conversion nécessaire');
  }
  
} catch (error) {
  console.log(`❌ Erreur: ${error.message}`);
  process.exit(1);
}