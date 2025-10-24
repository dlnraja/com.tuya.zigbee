#!/usr/bin/env node

/**
 * AMÉLIORATION MULTI-BATTERY - SANS BREAKING CHANGE
 * 
 * Clarification des noms pour afficher les batteries supportées
 * Exemple: "Motion Sensor (CR2032/AAA)"
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
const drivers = fs.readdirSync(driversDir).filter(f => 
  fs.statSync(path.join(driversDir, f)).isDirectory()
);

console.log('\n📝 AMÉLIORATION NOMS MULTI-BATTERY\n');

let updated = 0;
let skipped = 0;

for (const driverId of drivers) {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) continue;
  
  try {
    const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const batteries = driver.energy?.batteries || [];
    
    // Skip si pas multi-battery
    if (batteries.length <= 1) {
      skipped++;
      continue;
    }
    
    // Vérifier si le nom contient déjà les batteries
    const currentName = driver.name?.en || driverId;
    const batteryStr = batteries.join('/');
    
    if (currentName.includes(batteryStr)) {
      console.log(`⏭️  ${driverId}: Already has batteries in name`);
      skipped++;
      continue;
    }
    
    // Ajouter batteries au nom
    let newName = currentName;
    
    // Retirer ancien (Battery) générique
    newName = String(newName).replace(/\s*\(Battery\)\s*$/i, '');
    
    // Ajouter batterie supportées
    newName = `${newName} (${batteryStr})`;
    
    driver.name.en = newName;
    
    // Sauvegarder
    fs.writeFileSync(composePath, JSON.stringify(driver, null, 2) + '\n');
    
    console.log(`✅ ${driverId}`);
    console.log(`   Old: "${currentName}"`);
    console.log(`   New: "${newName}"`);
    updated++;
    
  } catch (err) {
    console.error(`❌ Error: ${driverId}:`, err.message);
  }
}

console.log(`\n📊 RÉSUMÉ:`);
console.log(`   Updated: ${updated}`);
console.log(`   Skipped: ${skipped}`);
console.log(`\n✅ Terminé\n`);
