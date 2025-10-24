#!/usr/bin/env node

/**
 * REMOVE DUPLICATE DRIVERS
 * Supprime les drivers en double (sans préfixe quand version avec préfixe existe)
 */

const fs = require('fs');
const path = require('path');

console.log('\n🗑️  REMOVE DUPLICATE DRIVERS\n');

const driversDir = path.join(__dirname, '..', 'drivers');

// Drivers à supprimer (doublons)
const duplicatesToRemove = [
  'garage_door_opener_cr2032',
  'pet_feeder_cr2032',
  'tank_level_monitor_cr2032'
];

console.log('Drivers doublons à supprimer:\n');
duplicatesToRemove.forEach(d => console.log(`   ❌ ${d}`));

console.log('\n\nSuppression...\n');

let removed = 0;
let errors = 0;

for (const driver of duplicatesToRemove) {
  const driverPath = path.join(driversDir, driver);
  
  if (!fs.existsSync(driverPath)) {
    console.log(`⏭️  Skip: ${driver} (not found)`);
    continue;
  }
  
  try {
    // Supprimer récursivement
    fs.rmSync(driverPath, { recursive: true, force: true });
    console.log(`✅ Removed: ${driver}`);
    removed++;
  } catch (err) {
    console.error(`❌ Error: ${driver} - ${err.message}`);
    errors++;
  }
}

console.log(`\n✅ Suppression terminée:`);
console.log(`   Supprimés: ${removed}`);
console.log(`   Erreurs: ${errors}\n`);

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         REMOVE DUPLICATE DRIVERS - TERMINÉ                    ║
╚═══════════════════════════════════════════════════════════════╝

📊 RÉSULTATS:
   Drivers supprimés:    ${removed}
   Erreurs:              ${errors}

✅ Les versions avec préfixe tuya_ sont conservées!
`);
