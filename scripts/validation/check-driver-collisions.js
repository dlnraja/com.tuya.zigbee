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
const FALLBACK_DRIVERS = ['universal_fallback', 'generic_tuya'];

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
    
    // Check for invalid wildcards
    mfrs.forEach(mfr => {
      if (INVALID_PATTERNS.includes(mfr)) {
        console.log(`❌ INVALID WILDCARD: ${driverName} has "${mfr}" (must use full ID)`);
        hasErrors = true;
      }
    });
    
    // Build combinations
    mfrs.forEach(mfr => {
      pids.forEach(pid => {
        const key = `${mfr}|${pid}`;
        if (!combinations.has(key)) combinations.set(key, []);
        combinations.get(key).push(driverName);
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
