#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION ABSOLUE DE TOUS LES CHEMINS INCORRECTS...\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const drivers = fs.readdirSync(driversDir);

let fixed = 0;
let errors = 0;

drivers.forEach(driverName => {
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) return;
  
  try {
    let content = fs.readFileSync(composePath, 'utf8');
    const originalContent = content;
    
    // Regex global pour tous les chemins de drivers dans images
    // Pattern: drivers/ANYTHING/assets où ANYTHING != driverName
    const imagePathRegex = new RegExp(`drivers/([a-z_0-9]+)/assets/images/(small|large|xlarge)\\.png`, 'g');
    content = content.replace(imagePathRegex, (match, oldDriver, size) => {
      if (oldDriver !== driverName) {
        return `drivers/${driverName}/assets/images/${size}.png`;
      }
      return match;
    });
    
    // Regex global pour tous les chemins de learnmode
    const learnmodePathRegex = new RegExp(`/drivers/([a-z_0-9]+)/assets/learnmode\\.svg`, 'g');
    content = content.replace(learnmodePathRegex, (match, oldDriver) => {
      if (oldDriver !== driverName) {
        return `/drivers/${driverName}/assets/learnmode.svg`;
      }
      return match;
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(composePath, content, 'utf8');
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
}
