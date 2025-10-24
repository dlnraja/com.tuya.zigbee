#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION DE TOUS LES ANCIENS CHEMINS DE MARQUE...\n');

const OLD_BRAND_PREFIXES = [
  'avatto_',
  'zemismart_',
  'lsc_',
  'philips_',
  'innr_',
  'osram_',
  'samsung_',
  'sonoff_',
  'moes_',
  'nous_',
  'lonsonho_',
  'tuya_'
];

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
    let modified = false;
    
    // Chercher et remplacer tous les anciens noms de marque dans les chemins
    OLD_BRAND_PREFIXES.forEach(prefix => {
      // Pattern pour les chemins d'images et learnmode
      const oldPathPattern1 = new RegExp(`drivers/${prefix}[a-z_]+/assets`, 'g');
      const oldPathPattern2 = new RegExp(`/drivers/${prefix}[a-z_]+/assets`, 'g');
      
      if (content.match(oldPathPattern1) || content.match(oldPathPattern2)) {
        // Remplacer par le nom du driver actuel
        content = content.replace(oldPathPattern1, `drivers/${driverName}/assets`);
        content = content.replace(oldPathPattern2, `/drivers/${driverName}/assets`);
        modified = true;
      }
    });
    
    if (modified && content !== originalContent) {
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
  console.log(`\n💡 Maintenant lancer: homey app build`);
}
