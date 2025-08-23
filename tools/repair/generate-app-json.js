#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 GÉNÉRATION DE APP.JSON');
console.log('==========================');

// Chemin vers le dossier drivers
const driversPath = path.join(__dirname, '../../drivers');
const appJsonPath = path.join(__dirname, '../../app.json');

try {
  // Lire tous les dossiers de drivers
  const driverDirs = fs.readdirSync(driversPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`📂 Trouvé ${driverDirs.length} dossiers de drivers`);

  const drivers = [];
  let processedCount = 0;

  // Traiter chaque driver
  for (const driverDir of driverDirs) {
    const driverComposePath = path.join(driversPath, driverDir, 'driver.compose.json');
    
    if (!fs.existsSync(driverComposePath)) {
      console.log(`⚠️  ${driverDir}: driver.compose.json manquant`);
      continue;
    }

    try {
      // Lire le fichier
      const content = fs.readFileSync(driverComposePath, 'utf8');
      const driverConfig = JSON.parse(content);

      // Ajouter le driver à la liste
      drivers.push(driverConfig);
      processedCount++;
      console.log(`✅ ${driverDir} - traité`);

    } catch (error) {
      console.log(`❌ ${driverDir}: Erreur - ${error.message}`);
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
      "email": "dylan.rajasekaram@gmail.com"
    },
    "contributors": [],
    "support": "mailto:dylan.rajasekaram@gmail.com",
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
  const updatedContent = JSON.stringify(appConfig, null, 2);
  fs.writeFileSync(appJsonPath, updatedContent, 'utf8');

  console.log(`\n📊 RÉSUMÉ:`);
  console.log(`   - Drivers traités: ${processedCount}`);
  console.log(`   - Total: ${drivers.length}`);
  console.log(`   - app.json généré avec succès`);
  
  console.log('\n🎉 GÉNÉRATION TERMINÉE !');
  console.log('🚀 Prêt pour validation Homey');

  // Vérification
  console.log('\n🔍 VÉRIFICATION...');
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

} catch (error) {
  console.log(`❌ Erreur: ${error.message}`);
  process.exit(1);
}
