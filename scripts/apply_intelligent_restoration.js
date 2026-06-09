#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔄 RESTAURATION INTELLIGENTE MANUFACTURER NAMES\n');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const ANALYSIS_FILE = path.join(ROOT, 'MANUFACTURER_RESTORATION_ANALYSIS.json');

let stats = {
  filesModified: 0,
  namesRestored: 0,
  backupsCreated: 0
};

// Limites par catégorie
const CATEGORY_LIMITS = {
  sensor: 30,      // climate, motion, contact, soil, etc.
  switch: 30,      // switch_1gang, switch_2gang, etc.
  plug: 25,        // plug_smart, plug_energy_monitor
  button: 20,      // button_wireless_*
  cover: 25,       // curtain_motor
  smoke: 25,       // smoke_detector
  water: 20,       // water_leak
  other: 20        // défaut
};

/**
 * Déterminer catégorie driver
 */
function getDriverCategory(driverName) {
  if (driverName.includes('sensor') || driverName.includes('climate') ||
    driverName.includes('soil') || driverName.includes('vibration')) {
    return 'sensor';
  }
  if (driverName.includes('switch')) return 'switch';
  if (driverName.includes('plug')) return 'plug';
  if (driverName.includes('button')) return 'button';
  if (driverName.includes('curtain') || driverName.includes('cover')) return 'cover';
  if (driverName.includes('smoke') || driverName.includes('gas')) return 'smoke';
  if (driverName.includes('water')) return 'water';
  return 'other';
}

/**
 * Restaurer manufacturer names pour un driver
 */
function restoreDriver(restoration) {
  const driverPath = path.join(DRIVERS_DIR, restoration.driver);
  const composeFile = path.join(driverPath, 'driver.compose.json');

  if (!fs.existsSync(composeFile)) {
    console.log(`   ⚠️  ${restoration.driver}: driver.compose.json non trouvé`);
    return;
  }

  try {
    const content = fs.readFileSync(composeFile, 'utf8');
    const driver = JSON.parse(content);

    if (!driver.zigbee) return;

    const currentNames = driver.zigbee.manufacturerName || [];
    const category = getDriverCategory(restoration.driver);
    const limit = CATEGORY_LIMITS[category] || 20;

    // Fusionner et limiter
    const allNames = [...new Set([...currentNames, ...restoration.toRestore])];
    const limitedNames = allNames.slice(0, limit);

    // Sauvegarder si différent
    if (limitedNames.length !== currentNames.length) {
      // Backup
      const backupPath = `${composeFile}.backup-restore-${Date.now()}`;
      fs.copyFileSync(composeFile, backupPath);
      stats.backupsCreated++;

      driver.zigbee.manufacturerName = limitedNames;
      fs.writeFileSync(composeFile, JSON.stringify(driver, null, 2), 'utf8');

      stats.filesModified++;
      stats.namesRestored += (limitedNames.length - currentNames.length);

      console.log(`   ✅ ${restoration.driver}: ${currentNames.length} → ${limitedNames.length} (+${limitedNames.length - currentNames.length})`);
    } else {
      console.log(`   ℹ️  ${restoration.driver}: déjà à la limite (${currentNames.length})`);
    }

  } catch (e) {
    console.error(`   ❌ ${restoration.driver}:`, e.message);
  }
}

// EXÉCUTION
console.log('📂 Chargement analyse...\n');

if (!fs.existsSync(ANALYSIS_FILE)) {
  console.error('❌ Fichier MANUFACTURER_RESTORATION_ANALYSIS.json non trouvé');
  console.error('   Exécutez d\'abord: node scripts/restore_manufacturer_names.js\n');
  process.exit(1);
}

const restorations = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf8'));

console.log(`📊 ${restorations.length} drivers à restaurer\n`);
console.log('🎯 Application restaurations avec limites intelligentes...\n');

restorations.forEach(restoration => {
  restoreDriver(restoration);
});

// RAPPORT
console.log('\n\n📊 RAPPORT RESTAURATION:\n');
console.log(`   Fichiers modifiés: ${stats.filesModified}`);
console.log(`   Manufacturer names restaurés: ${stats.namesRestored}`);
console.log(`   Backups créés: ${stats.backupsCreated}\n`);

if (stats.filesModified > 0) {
  console.log('✅ RESTAURATION APPLIQUÉE\n');
  console.log('💡 LIMITES PAR CATÉGORIE:');
  console.log('   - Sensors: 30 IDs max');
  console.log('   - Switches: 30 IDs max');
  console.log('   - Plugs: 25 IDs max');
  console.log('   - Buttons: 20 IDs max');
  console.log('   - Covers: 25 IDs max');
  console.log('   - Smoke/Gas: 25 IDs max');
  console.log('   - Water: 20 IDs max');
  console.log('   - Autres: 20 IDs max\n');

  console.log('🎯 PROCHAINES ÉTAPES:');
  console.log('   1. Audit: node scripts/audit_complete_advanced.js');
  console.log('   2. Valider: homey app validate --level publish');
  console.log('   3. Build: homey app build\n');
}

process.exit(0);
