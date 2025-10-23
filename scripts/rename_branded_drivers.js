#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔄 RENOMMAGE DES DRIVERS AVEC MARQUES...\n');

const renameMapPath = path.join(__dirname, 'RENAME_PLAN_BRANDED.json');
const renameMap = JSON.parse(fs.readFileSync(renameMapPath, 'utf8'));

const driversDir = path.join(__dirname, '..', 'drivers');

let renamed = 0;
let errors = 0;
let skipped = 0;

Object.keys(renameMap).forEach(oldName => {
  const newName = renameMap[oldName];
  const oldPath = path.join(driversDir, oldName);
  const newPath = path.join(driversDir, newName);
  
  if (!fs.existsSync(oldPath)) {
    console.log(`⏭️  ${oldName} n'existe pas (déjà renommé?)`);
    skipped++;
    return;
  }
  
  if (fs.existsSync(newPath)) {
    console.log(`⚠️  ${newName} existe déjà! Skip ${oldName}`);
    skipped++;
    return;
  }
  
  try {
    fs.renameSync(oldPath, newPath);
    console.log(`✅ ${oldName} → ${newName}`);
    renamed++;
  } catch (err) {
    console.error(`❌ Erreur ${oldName}:`, err.message);
    errors++;
  }
});

console.log(`\n📊 RÉSUMÉ:`);
console.log(`   Renommés: ${renamed}`);
console.log(`   Sautés: ${skipped}`);
console.log(`   Erreurs: ${errors}`);

if (renamed > 0) {
  console.log(`\n💡 PROCHAINES ÉTAPES:`);
  console.log(`   1. Mettre à jour les IDs dans driver.compose.json`);
  console.log(`   2. Mettre à jour les chemins d'images`);
  console.log(`   3. Lancer: homey app build`);
}
