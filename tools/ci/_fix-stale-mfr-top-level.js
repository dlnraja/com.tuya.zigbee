#!/usr/bin/env node
'use strict';

/**
 * tools/ci/_fix-stale-mfr-top-level.js
 *
 * P64.4 — Fix stale top-level mfs_db entries that point to wrong drivers.
 *
 * Background: The auto-sync process created mixed-case duplicate top-level
 * entries (e.g. `_TZE200_2aaelwxk`) that still point to the OLD driver
 * (motion_sensor), while the all-caps version (e.g. `_TZE200_2AAELWXK`)
 * was correctly updated to `presence_sensor_radar`.
 *
 * At runtime, Object.keys() returns mixed-case keys first if inserted
 * that way, so the wrong driver is used.
 *
 * This script makes the mixed-case entries point to the correct driver.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MFS_DB = path.join(ROOT, 'data', 'mfs_db.json');

// mfr -> correct driverId
const FIXES = {
  // P64.4 batch 1 — ZG-204Z family mmWave presence sensors
  '_TZE200_2aaelwxk': 'presence_sensor_radar',
  '_TZE204_2aaelwxk': 'presence_sensor_radar',
  '_TZE200_kb5noeto': 'presence_sensor_radar',
  '_TZE204_3towulqd': 'presence_sensor_radar',
  '_TZE200_3towulqd': 'presence_sensor_radar',
  // P64.4 batch 2 — soil sensor family stale top-level entries
  '_TZE284_AWEPDIWI': 'soil_sensor',           // was climate_sensor (P19.1 HOBEIAN fix)
  '_tze284_oitavov2': 'soil_sensor',           // was sensor_climate_contact
  '_TZE284_ga1maeof': 'soil_sensor',           // was soilsensor (legacy naming)
};

const db = JSON.parse(fs.readFileSync(MFS_DB, 'utf8'));
let fixed = 0;

for (const [mfr, correctDriver] of Object.entries(FIXES)) {
  const entry = db[mfr];
  if (!entry) {
    console.log(`  ⚠ ${mfr} — not found in top-level`);
    continue;
  }
  const oldDriver = entry.driverId;
  if (oldDriver === correctDriver) {
    console.log(`  ✓ ${mfr} — already ${correctDriver}`);
    continue;
  }
  if (!oldDriver) {
    console.log(`  ⚠ ${mfr} — no driverId field (entry has only manufacturerId/modelIds)`);
    continue;
  }
  entry.driverId = correctDriver;
  entry.source = 'p64.4-stale-fix';
  delete entry.addedAt; // remove old auto-sync timestamp
  fixed++;
  console.log(`  ✓ ${mfr}: ${oldDriver} → ${correctDriver}`);
}

if (fixed > 0) {
  fs.writeFileSync(MFS_DB, JSON.stringify(db, null, 2));
  console.log(`\n✅ ${fixed} stale top-level mfs_db entries fixed → ${MFS_DB}`);
} else {
  console.log('\n✅ No fixes needed');
}
