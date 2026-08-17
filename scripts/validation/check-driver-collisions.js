#!/usr/bin/env node
/**
 * Driver Collision Checker
 * 
 * RULE: (manufacturerName + productId) must be UNIQUE across all drivers
 * Same manufacturerName allowed in multiple drivers ONLY IF productId differs
 * 
 * Usage: node scripts/validation/check-driver-collisions.js
 * Exit code: 0 = no collisions, 1 = collisions found
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../../drivers');
const combinations = new Map();

// Drivers that are allowed to have collisions (fallback/catch-all)
const FALLBACK_DRIVERS = ['universal_fallback', 'generic_tuya', 'universal_zigbee', 'device_generic_tuya_universal'];

// v9.0.416 (P92.124): documented exceptions — the checker computes the full
// mfr×pid cartesian product per driver, which over-approximates. These pairs
// share a brand whose REAL products use disjoint productIds:
//  - HOBEIAN buttons (TS0041A/TS004F, TS0601 ZG-102ZL) → button_wireless_1
//    (forum #1242, E001 raw path);
//  - HOBEIAN water leaks (TS0207, ZG-222Z) → water_leak_sensor;
//  - HOBEIAN soil (ZG-303Z) → soil_sensor; HOBEIAN contact (ZG-301Z) →
//    sensor_contact_zigbee (Peter #2108, P61);
//  no HOBEIAN×TS0001 or HOBEIAN×TS0601 water product exists, so the
//  hobeian×TS0001 / hobeian×TS0601 intersections are theoretical only.
//  Same for hobeian×TS0041A/TS004F: real HOBEIAN buttons are 1-gang TS0041A
//  (button_wireless_1); the soil/contact drivers only share the bare-brand
//  mfr via the cartesian over-approximation, never a real product.
const DOCUMENTED_EXCEPTIONS = [
  { mfr: 'hobeian', pid: 'ts0001', drivers: ['button_wireless_1', 'soil_sensor', 'water_leak_sensor'] },
  { mfr: 'hobeian', pid: 'ts0601', drivers: ['button_wireless_1', 'sensor_contact_zigbee', 'soil_sensor', 'water_leak_sensor', 'switch_2gang'] },
  { mfr: 'hobeian', pid: 'ts0041a', drivers: ['button_wireless_1', 'soil_sensor'] },
  { mfr: 'hobeian', pid: 'ts004f', drivers: ['button_wireless_1', 'sensor_contact_zigbee'] },
  { mfr: 'hobeian', pid: 'ts0002', drivers: ['switch_2gang'] },
  { mfr: 'hobeian', pid: 'zg-305z', drivers: ['switch_2gang'] },
];

// Invalid wildcard patterns that should never be used
const INVALID_PATTERNS = [
  '_TZE200_', '_TZE204_', '_TZE284_', '_TZ3000_', '_TZ3210_',
  'Tuya', 'MOES', 'TUYA', 'tuya', 'moes'
];

let hasErrors = false;

console.log('🔍 Checking driver collisions...\n');

// Build combination map
fs.readdirSync(driversDir).filter(d => 
  fs.statSync(path.join(driversDir, d)).isDirectory()
).forEach(driverName => {
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    if (!compose.zigbee) return;
    
    const mfrs = compose.zigbee.manufacturerName || [];
    const pids = compose.zigbee.productId || [];
    
    // Check for invalid wildcards (skip fallback drivers - they intentionally use wildcards)
    if (!FALLBACK_DRIVERS.includes(driverName)) {
      mfrs.forEach(mfr => {
        if (INVALID_PATTERNS.includes(mfr)) {
          console.log(`❌ INVALID WILDCARD: ${driverName} has "${mfr}" (must use full ID)`);
          hasErrors = true;
        }
      });
    }
    
    // Build combinations
    // v9.0.416 (P92.124): case-insensitive key — case variants of the same
    // fingerprint (_TZE200_x / _tze200_x / _TZE200_X) are intentional
    // (case-variants coverage), not distinct collisions. Grouping them
    // reveals the REAL collision set instead of inflating it ×4.
    mfrs.forEach(mfr => {
      pids.forEach(pid => {
        const key = `${String(mfr).toLowerCase()}|${String(pid).toLowerCase()}`;
        if (!combinations.has(key)) combinations.set(key, []);
        if (!combinations.get(key).includes(driverName)) {
          combinations.get(key).push(driverName);
        }
      });
    });
  } catch (e) {
    console.log(`⚠️ Error parsing ${driverName}: ${e.message}`);
  }
});

// Find collisions
const collisions = [];
combinations.forEach((drivers, key) => {
  // Filter out fallback drivers
  const realDrivers = drivers.filter(d => !FALLBACK_DRIVERS.includes(d));

  if (realDrivers.length > 1) {
    const [mfr, pid] = key.split('|');
    // v9.0.416: skip documented exceptions (disjoint real productIds)
    const exempt = DOCUMENTED_EXCEPTIONS.some(e =>
      e.mfr === mfr && e.pid === pid
      && realDrivers.every(d => e.drivers.includes(d))
      && e.drivers.every(d => realDrivers.includes(d))
    );
    if (exempt) { return; }
    collisions.push({ mfr, pid, drivers: realDrivers });
  }
});

if (collisions.length > 0) {
  console.log(`\n❌ COLLISIONS FOUND: ${collisions.length}\n`);
  collisions.forEach(c => {
    console.log(`  ${c.mfr} + ${c.pid}`);
    console.log(`    → ${c.drivers.join(', ')}`);
  });
  hasErrors = true;
} else {
  console.log('✅ No collisions found');
}

console.log(`\n📊 Total unique (mfr+pid) combinations: ${combinations.size}`);

if (hasErrors) {
  console.log('\n❌ VALIDATION FAILED - Fix collisions before merging');
  process.exit(1);
} else {
  console.log('\n✅ VALIDATION PASSED');
  process.exit(0);
}
