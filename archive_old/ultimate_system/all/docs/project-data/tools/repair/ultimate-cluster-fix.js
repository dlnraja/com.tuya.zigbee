#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION ULTIME CLUSTERS - MODE RÉCURSIF');
console.log('==============================================');

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

function fixDriverCompose(driverDir) {
  const driverComposePath = path.join(driversPath, driverDir, 'driver.compose.json');
  
  if (!fs.existsSync(driverComposePath)) {
    return { success: false, error: 'Fichier manquant' };
  }

  try {
    // Lire le fichier
    const content = fs.readFileSync(driverComposePath, 'utf8');
    const driverConfig = JSON.parse(content);
    
    let modified = false;
    
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
            modified = true;
          }
        }
      }
    }
    
    // Sauvegarder si modifié
    if (modified) {
      const updatedContent = JSON.stringify(driverConfig, null, 2);
      fs.writeFileSync(driverComposePath, updatedContent, 'utf8');
      
      // Vérifier que le fichier a été sauvegardé correctement
      const savedContent = fs.readFileSync(driverComposePath, 'utf8');
      const savedConfig = JSON.parse(savedContent);
      
      // Vérifier que les clusters sont bien numériques
      let allNumeric = true;
      if (savedConfig.zigbee && savedConfig.zigbee.endpoints) {
        for (const endpointId in savedConfig.zigbee.endpoints) {
          const endpoint = savedConfig.zigbee.endpoints[endpointId];
          if (endpoint.clusters && Array.isArray(endpoint.clusters)) {
            if (!endpoint.clusters.every(c => typeof c === 'number')) {
              allNumeric = false;
              break;
            }
          }
        }
      }
      
      return { 
        success: true, 
        modified: true, 
        allNumeric,
        clusters: savedConfig.zigbee?.endpoints?.['1']?.clusters || []
      };
    }
    
    return { success: true, modified: false };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateAppJson() {
  try {
    // Lire tous les dossiers de drivers
    const driverDirs = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`📂 Traitement de ${driverDirs.length} drivers...`);

    const drivers = [];
    let correctedCount = 0;
    let totalFiles = 0;

    // Traiter chaque driver
    for (const driverDir of driverDirs) {
      totalFiles++;
      const result = fixDriverCompose(driverDir);
      
      if (result.success) {
        if (result.modified) {
          correctedCount++;
          console.log(`✅ ${driverDir} - clusters convertis: [${result.clusters.join(', ')}]`);
        }
        
        // Lire le fichier corrigé pour app.json
        const driverComposePath = path.join(driversPath, driverDir, 'driver.compose.json');
        const content = fs.readFileSync(driverComposePath, 'utf8');
        const driverConfig = JSON.parse(content);
        drivers.push(driverConfig);
      } else {
        console.log(`❌ ${driverDir}: ${result.error}`);
      }
    }

    // Créer app.json
    const appConfig = {
      "id": "com.tuya.zigbee",
      "version": "1.0.0",
      "compatibility": ">=5.0.0",
      "category": ["appliances"],
      "name": {
        "en": "Tuya Zigbee",
        "fr": "Tuya Zigbee",
        "nl": "Tuya Zigbee",
        "ta": "Tuya Zigbee"
      },
      "description": {
        "en": "Tuya Zigbee devices support",
        "fr": "Support des appareils Tuya Zigbee",
        "nl": "Ondersteuning voor Tuya Zigbee-apparaten",
        "ta": "Tuya Zigbee சாதனங்களுக்கான ஆதரவு"
      },
      "author": {
        "name": "dlnraja",
        "email": "[redacted-email]"
      },
      "contributors": [],
      "support": "mailto:[redacted-email]",
      "homepage": "https://github.com/dlnraja/tuya_repair",
      "license": "MIT",
      "platforms": ["local"],
      "drivers": drivers,
      "images": {
        "small": "assets/small.svg",
        "large": "assets/large.svg"
      },
      "icon": "assets/icon.svg",
      "color": "#FF6B35",
      "tags": {
        "en": ["tuya", "zigbee", "home automation", "smart home"],
        "fr": ["tuya", "zigbee", "automatisation", "maison intelligente"],
        "nl": ["tuya", "zigbee", "home automatisering", "slim huis"],
        "ta": ["tuya", "zigbee", "வீட்டு தானியக்கம்", "ஸ்மார்ட் ஹோம்"]
      }
    };

    // Sauvegarder app.json
    const appJsonPath = path.join(__dirname, '../../app.json');
    const updatedContent = JSON.stringify(appConfig, null, 2);
    fs.writeFileSync(appJsonPath, updatedContent, 'utf8');

    console.log(`\n📊 RÉSUMÉ:`);
    console.log(`   - Drivers traités: ${totalFiles}`);
    console.log(`   - Drivers corrigés: ${correctedCount}`);
    console.log(`   - Total: ${drivers.length}`);
    console.log(`   - app.json généré avec succès`);
    
    // Vérification finale
    console.log('\n🔍 VÉRIFICATION FINALE...');
    if (drivers.length > 0) {
      const sampleDriver = drivers[0];
      if (sampleDriver.zigbee && sampleDriver.zigbee.endpoints) {
        const sampleEndpoint = sampleDriver.zigbee.endpoints['1'];
        if (sampleEndpoint.clusters) {
          console.log(`   Exemple: ${sampleDriver.id}`);
          console.log(`   Clusters: [${sampleEndpoint.clusters.join(', ')}]`);
          const allNumeric = sampleEndpoint.clusters.every(c => typeof c === 'number');
          console.log(`   ✅ Tous numériques: ${allNumeric}`);
        }
      }
    }
    
    return { success: true, correctedCount, totalFiles };
    
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Exécution principale
try {
  console.log('🚀 Début de la correction récursive...\n');
  
  const result = generateAppJson();
  
  if (result.success) {
    console.log('\n🎉 CORRECTION ULTIME TERMINÉE !');
    console.log('🚀 Prêt pour validation Homey');
    
    console.log('\n📋 PROCHAINES ÉTAPES:');
    console.log('   1. Vérifier app.json généré');
    console.log('   2. Exécuter homey app validate');
    console.log('   3. Si erreurs, relancer ce script');
  } else {
    console.log('\n❌ ÉCHEC DE LA CORRECTION');
    console.log(`   Erreur: ${result.error}`);
    process.exit(1);
  }
  
} catch (error) {
  console.log(`❌ Erreur générale: ${error.message}`);
  process.exit(1);
}
