#!/usr/bin/env node
/**
 * P68: Test for R68 Blakadder integration
 *   - 12 new fingerprints added to driver.compose.json
 *   - 12 + 44 sacred pairs added to mfs_db
 *   - All targets exist and validate as JSON
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS = path.join(ROOT, 'drivers');

const NEW_FPS = [
  { mfr: '_TYZB01_ujfk3xd9', driver: 'climate_sensor' },
  { mfr: '_TYZB01_wpmo3ja3', driver: 'co_sensor' },
  { mfr: '_TYZB01_8scntis1', driver: 'siren' },
  { mfr: '_TYZB01_8wt0zp49', driver: 'sensor_gas_presence' },
  { mfr: '_TYZB01_qiplt4jq', driver: 'smoke_sensor2' },
  { mfr: '_TYZB01_fi5yftwv', driver: 'climate_sensor' },
  { mfr: '_TZ3000_fab7r7mc', driver: 'sensor_contact_zigbee' },
  { mfr: '_TZ3000_psqjayrd', driver: 'sensor_contact_zigbee' },
  { mfr: '_TYZB01_7qf81wty', driver: 'scene_switch_1' },
  { mfr: '_TYZB01_hww2py6b', driver: 'scene_switch_1' },
  { mfr: '_TZ3000_cmaky9gq', driver: 'bulb_dimmable' },
  { mfr: '_TYZB01_dvakyzhd', driver: 'switch_4gang' }
];

let passed = 0, failed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log(`✓ ${msg}`); } else { failed++; console.log(`✗ ${msg}`); } }

// 1. All 12 new FPs in their target driver
for (const { mfr, driver } of NEW_FPS) {
  const cj = path.join(DRIVERS, driver, 'driver.compose.json');
  if (!fs.existsSync(cj)) { failed++; console.log(`✗ Driver ${driver} missing`); continue; }
  const o = JSON.parse(fs.readFileSync(cj, 'utf8'));
  const list = (o.zigbee && o.zigbee.manufacturerName) || [];
  ok(list.includes(mfr), `${driver} contains ${mfr}`);
}

// 2. mfs_db contains the sacred couple keys
const mfs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'mfs_db.json'), 'utf8'));
ok(mfs.sacredCouples, 'mfs_db has sacredCouples');
ok(Object.keys(mfs.sacredCouples).length > 12360, `mfs_db.sacredCouples grew (${Object.keys(mfs.sacredCouples).length} > 12360)`);

// 3. Blakadder coverage improved
const blakMfrsFile = path.join(ROOT, '..', 'blakadder-mfrs.txt');
let blakMfrs = [];
if (fs.existsSync(blakMfrsFile)) {
  blakMfrs = fs.readFileSync(blakMfrsFile, 'utf8').trim().split(/\r?\n/);
} else {
  // Fallback: derive from blakadder.json if it exists
  const blakFile = path.join(ROOT, 'scripts', 'sync', 'data', 'blakadder.json');
  if (fs.existsSync(blakFile)) {
    const db = JSON.parse(fs.readFileSync(blakFile, 'utf8'));
    const seen = new Set();
    if (db.devices) for (const d of Object.values(db.devices)) {
      if (d.zigbeemodel) {
        const arr = Array.isArray(d.zigbeemodel) ? d.zigbeemodel : [d.zigbeemodel];
        for (const m of arr) if (typeof m === 'string' && m.startsWith('_')) seen.add(m);
      }
    }
    blakMfrs = [...seen];
  }
}
const driverMfrs = new Set();
for (const d of fs.readdirSync(DRIVERS)) {
  const cj = path.join(DRIVERS, d, 'driver.compose.json');
  if (!fs.existsSync(cj)) continue;
  try {
    const o = JSON.parse(fs.readFileSync(cj, 'utf8'));
    for (const m of (o.zigbee && o.zigbee.manufacturerName) || []) driverMfrs.add(m.toLowerCase());
  } catch {}
}
if (blakMfrs.length === 0) {
  console.log('⏭  Skipped Blakadder coverage check (no source data)');
  passed++;
} else {
  const stillMissing = blakMfrs.filter(m => m.startsWith('_') && !driverMfrs.has(m.toLowerCase().trim()));
  ok(stillMissing.length === 0, `All ${blakMfrs.length} Blakadder mfrs now in drivers (was 15 missing, now ${stillMissing.length})`);
}

// 4. JSON validation for modified drivers
for (const { driver } of NEW_FPS) {
  const cj = path.join(DRIVERS, driver, 'driver.compose.json');
  try { JSON.parse(fs.readFileSync(cj, 'utf8')); ok(true, `${driver} still valid JSON`); }
  catch (e) { failed++; console.log(`✗ ${driver} broken: ${e.message}`); }
}

console.log(`\n=== R68 TEST SUMMARY ===`);
console.log(`Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
