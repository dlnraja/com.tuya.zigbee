#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP_JSON = path.join(ROOT, 'app.json');

console.log('🔧 Correction des chemins d\'images incorrects dans app.json\n');

// Lire app.json
const appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));

let fixes = 0;

if (appJson.drivers) {
  for (const driver of appJson.drivers) {
    if (driver.images && driver.id) {
      // Vérifier si les chemins d'images correspondent à l'ID du driver
      const expectedSmallPath = `drivers/${driver.id}/assets/images/small.png`;
      const expectedLargePath = `drivers/${driver.id}/assets/images/large.png`;
      
      let driverFixed = false;
      
      if (driver.images.small && driver.images.small !== expectedSmallPath) {
        console.log(`❌ ${driver.id}:`);
        console.log(`   Small: ${driver.images.small}`);
        console.log(`   → ${expectedSmallPath}`);
        driver.images.small = expectedSmallPath;
        driverFixed = true;
      }
      
      if (driver.images.large && driver.images.large !== expectedLargePath) {
        if (!driverFixed) {
          console.log(`❌ ${driver.id}:`);
        }
        console.log(`   Large: ${driver.images.large}`);
        console.log(`   → ${expectedLargePath}`);
        driver.images.large = expectedLargePath;
        driverFixed = true;
      }
      
      if (driverFixed) {
        fixes++;
        console.log('');
      }
    }
  }
}

if (fixes > 0) {
  // Sauvegarder
  fs.writeFileSync(APP_JSON, JSON.stringify(appJson, null, 2) + '\n');
  console.log(`✅ ${fixes} driver(s) corrigé(s) dans app.json\n`);
} else {
  console.log('✅ Aucun chemin d\'image incorrect trouvé\n');
}
