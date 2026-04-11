#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🚀 APPLICATION ENRICHISSEMENT PHASE 2\n');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

let stats = {
  driversEnriched: 0,
  idsAdded: 0,
  driversNotFound: 0,
  backupsCreated: 0
};

const PHASE2_IDS = {
  // HIGH PRIORITY (Z2M)
  thermostat_tuya_dp: ['_TZE200_PAY2BYAX'],
  switch_4gang: ['_TZE204_AOCLFNXZ'],
  radiator_valve: ['_TZE200_SGPEACQP'],

  // GITHUB PRs
  motion_sensor: ['_TZ3000_C8OZAH8N'],
  water_leak_sensor: ['EWELINK'], // SQ510A model

  // MEDIUM PRIORITY (Z2M)
  bulb_rgbw: ['_TZ3000_ZMY4LSLW'],
  usb_outlet_advanced: ['_TZ3000_J4GG6D1B'],
  scene_switch_4: ['_TZ3000_KGVAMGXS']
};

function enrichDriver(driverName, newIds) {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');

  if (!fs.existsSync(composeFile)) {
    console.log(`   ⚠️  ${driverName}: driver non trouvé`);
    stats.driversNotFound++;
    return false;
  }

  try {
    const content = JSON.parse(fs.readFileSync(composeFile, 'utf8'));

    if (!content.zigbee || !content.zigbee.manufacturerName) {
      console.log(`   ⚠️  ${driverName}: pas de manufacturerName dans zigbee config`);
      return false;
    }

    const currentIds = content.zigbee.manufacturerName;
    const currentIdsUpper = new Set(currentIds.map(id => id.toUpperCase()));

    const idsToAdd = newIds.filter(id => !currentIdsUpper.has(id.toUpperCase()));

    if (idsToAdd.length === 0) {
      console.log(`   ✓ ${driverName}: tous les IDs déjà présents`);
      return false;
    }

    // Backup
    const backupPath = `${composeFile}.backup-phase2-${Date.now()}`;
    fs.copyFileSync(composeFile, backupPath);
    stats.backupsCreated++;

    // Ajouter nouveaux IDs (uppercase normalized)
    const normalizedNew = idsToAdd.map(id => id.toUpperCase());
    content.zigbee.manufacturerName = [...currentIds, ...normalizedNew];

    fs.writeFileSync(composeFile, JSON.stringify(content, null, 2), 'utf8');

    stats.driversEnriched++;
    stats.idsAdded += idsToAdd.length;

    console.log(`   ✅ ${driverName}: +${idsToAdd.length} IDs (${currentIds.length} → ${content.zigbee.manufacturerName.length})`);
    console.log(`      Ajoutés: ${normalizedNew.join(', ')}`);

    return true;

  } catch (e) {
    console.error(`   ❌ ${driverName}:`, e.message);
    return false;
  }
}

console.log('📂 Application enrichissement Phase 2...\n');

Object.entries(PHASE2_IDS).forEach(([driverName, ids]) => {
  enrichDriver(driverName, ids);
});

console.log('\n📊 RAPPORT PHASE 2:\n');
console.log(`   Drivers enrichis: ${stats.driversEnriched}`);
console.log(`   IDs ajoutés: ${stats.idsAdded}`);
console.log(`   Drivers non trouvés: ${stats.driversNotFound}`);
console.log(`   Backups créés: ${stats.backupsCreated}\n`);

if (stats.driversNotFound > 0) {
  console.log('⚠️  DRIVERS MANQUANTS (nécessitent création):\n');
  Object.keys(PHASE2_IDS).forEach(driver => {
    const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    if (!fs.existsSync(composePath)) {
      console.log(`   - ${driver} (${PHASE2_IDS[driver].join(', ')})`);
    }
  });
  console.log();
}

console.log('✅ PHASE 2 TERMINÉE\n');

process.exit(0);
