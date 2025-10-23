#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION DE TOUS LES CHEMINS ET IDS...\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const drivers = fs.readdirSync(driversDir);

let fixed = 0;
let errors = 0;

drivers.forEach(driverName => {
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    let modified = false;
    
    // Corriger les chemins d'images
    if (compose.images) {
      if (compose.images.small && !compose.images.small.includes(driverName)) {
        compose.images.small = `drivers/${driverName}/assets/images/small.png`;
        modified = true;
      }
      if (compose.images.large && !compose.images.large.includes(driverName)) {
        compose.images.large = `drivers/${driverName}/assets/images/large.png`;
        modified = true;
      }
      if (compose.images.xlarge && !compose.images.xlarge.includes(driverName)) {
        compose.images.xlarge = `drivers/${driverName}/assets/images/xlarge.png`;
        modified = true;
      }
    }
    
    // Corriger learnmode path
    if (compose.zigbee && compose.zigbee.learnmode && compose.zigbee.learnmode.image) {
      if (!compose.zigbee.learnmode.image.includes(driverName)) {
        compose.zigbee.learnmode.image = `/drivers/${driverName}/assets/learnmode.svg`;
        modified = true;
      }
    }
    
    // Corriger ID
    if (compose.id && compose.id !== driverName) {
      compose.id = driverName;
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
      console.log(`✅ ${driverName}`);
      fixed++;
    }
    
  } catch (err) {
    console.error(`❌ Erreur avec ${driverName}:`, err.message);
    errors++;
  }
});

console.log(`\n📊 RÉSUMÉ:`);
console.log(`   Corrigés: ${fixed}`);
console.log(`   Erreurs: ${errors}`);
console.log(`   Total: ${drivers.length}`);

if (fixed > 0) {
  console.log(`\n✅ ${fixed} drivers corrigés!`);
  console.log(`\n💡 Maintenant lancer: homey app build`);
}
