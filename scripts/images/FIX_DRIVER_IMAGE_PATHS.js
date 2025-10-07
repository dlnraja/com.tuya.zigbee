#!/usr/bin/env node
/**
 * FIX DRIVER IMAGE PATHS
 * 
 * Corrige les chemins d'images dans app.json pour chaque driver
 * De: "./assets/small.png"
 * Vers: "./drivers/DRIVERNAME/assets/small.png"
 */

const fs = require('fs');
const path = require('path');

const rootPath = __dirname;
const appJsonPath = path.join(rootPath, 'app.json');

console.log('🔧 FIX DRIVER IMAGE PATHS');
console.log('='.repeat(80));
console.log('');

// Charger app.json
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

console.log(`📋 ${appJson.drivers.length} drivers à vérifier`);
console.log('');

let fixed = 0;

for (const driver of appJson.drivers) {
  const driverId = driver.id;
  
  // Vérifier si images pointe vers ./assets/ au lieu de ./drivers/ID/assets/
  if (driver.images) {
    const smallPath = driver.images.small;
    const largePath = driver.images.large;
    
    // Si le chemin ne commence pas par ./drivers/
    if (smallPath && !smallPath.startsWith('./drivers/')) {
      driver.images.small = `./drivers/${driverId}/assets/small.png`;
      driver.images.large = `./drivers/${driverId}/assets/large.png`;
      console.log(`   ✅ ${driverId}`);
      fixed++;
    }
  }
}

console.log('');
console.log(`📊 ${fixed}/${appJson.drivers.length} drivers corrigés`);
console.log('');

// Sauvegarder
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

console.log('='.repeat(80));
console.log('✅ CHEMINS D\'IMAGES DRIVERS CORRIGÉS');
console.log('='.repeat(80));
console.log('');

console.log('📋 Prochaine étape:');
console.log('   homey app build && homey app validate --level=publish');
console.log('');

process.exit(0);
