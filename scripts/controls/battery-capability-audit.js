#!/usr/bin/env node
'use strict';

/**
 * Battery Capability Audit v8.1.0
 * 
 * Detects:
 * 1. SDK3 violations: measure_battery + alarm_battery coexistence
 * 2. Mains-powered drivers with false battery capabilities
 * 3. Fingerprint collisions between smart_fingerprints.js and new_fingerprints.js
 * 4. Battery drivers missing measure_battery or alarm_battery
 * 
 * Usage: node scripts/controls/battery-capability-audit.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const MAINS_DRIVER_PATTERNS = [
  'switch_', 'socket', 'plug', 'bulb_', 'dimmer', 'din_rail',
  'ceiling_fan', 'air_purifier', 'air_quality', 'curtain_motor',
  'usb_dongle', 'floor_heating', 'power_strip', 'siren_mains',
  'smart_ir', 'led_strip', 'light_', 'garage_door'
];

const BATTERY_DRIVER_PATTERNS = [
  'sensor_', 'button_', 'remote_', 'leak_sensor', 'smoke_sensor',
  'door_sensor', 'motion_sensor', 'soil_sensor', 'climate_sensor'
];

let errors = 0;
let warnings = 0;
let audited = 0;

console.log('═══════════════════════════════════════════════════════════════');
console.log('  Battery Capability Audit v8.1.0');
console.log('═══════════════════════════════════════════════════════════════\n');

// --- Phase 1: Scan driver.compose.json files ---
console.log('Phase 1: Scanning driver capabilities...\n');

const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
  const fullPath = path.join(DRIVERS_DIR, d);
  return fs.statSync(fullPath).isDirectory();
});

for (const driverDir of driverDirs) {
  const composePath = path.join(DRIVERS_DIR, driverDir, 'driver.compose.json');
  if (!fs.existsSync(composePath)) continue;

  audited++;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    const caps = compose.capabilities || [];
    const driverId = compose.id || driverDir;
    
    const hasMeasureBattery = caps.includes('measure_battery');
    const hasAlarmBattery = caps.includes('alarm_battery');
    const isMainsDriver = MAINS_DRIVER_PATTERNS.some(p => driverId.includes(p));
    const isBatteryDriver = BATTERY_DRIVER_PATTERNS.some(p => driverId.includes(p));

    // Check 1: SDK3 violation — both measure_battery AND alarm_battery
    if (hasMeasureBattery && hasAlarmBattery) {
      console.log(`  ❌ SDK3 VIOLATION: ${driverId} has BOTH measure_battery AND alarm_battery`);
      errors++;
    }

    // Check 2: Mains driver with battery capabilities
    if (isMainsDriver && (hasMeasureBattery || hasAlarmBattery)) {
      // Exclude known battery-backup variants
      const energy = compose.energy;
      const hasBatteries = energy?.batteries?.length > 0;
      if (!hasBatteries) {
        console.log(`  ⚠️  SUSPICIOUS: ${driverId} (mains pattern) has ${hasMeasureBattery ? 'measure_battery' : 'alarm_battery'}`);
        warnings++;
      }
    }

    // Check 3: Battery driver missing battery capabilities
    if (isBatteryDriver && !hasMeasureBattery && !hasAlarmBattery) {
      // Only warn if no energy config exists
      const energy = compose.energy;
      if (!energy || !energy.batteries) {
        console.log(`  ℹ️  INFO: ${driverId} (battery pattern) has no battery capabilities declared`);
      }
    }
  } catch (err) {
    console.log(`  ⚠️  PARSE ERROR: ${driverDir}/driver.compose.json — ${err.message}`);
    warnings++;
  }
}

// --- Phase 2: Check fingerprint collisions ---
console.log('\nPhase 2: Checking fingerprint collisions...\n');

try {
  const smartFPPath = path.join(ROOT, 'lib', 'data', 'smart_fingerprints.js');
  const newFPPath = path.join(ROOT, 'lib', 'data', 'new_fingerprints.js');

  if (fs.existsSync(smartFPPath) && fs.existsSync(newFPPath)) {
    // Parse smart_fingerprints using regex (it's a JS module)
    const smartContent = fs.readFileSync(smartFPPath, 'utf-8');
    const newContent = fs.readFileSync(newFPPath, 'utf-8');

    // Extract manufacturer -> driverId mappings
    const smartFPRegex = /'([^']+)':\s*\{\s*driverId:\s*'([^']+)'/g;
    const smartMap = {};
    let match;
    while ((match = smartFPRegex.exec(smartContent)) !== null) {
      smartMap[match[1]] = match[2];
    }

    const newFPRegex = /'([^']+)':\s*\{\s*driverId:\s*'([^']+)'/g;
    const newMap = {};
    while ((match = newFPRegex.exec(newContent)) !== null) {
      newMap[match[1]] = match[2];
    }

    // Find collisions
    let collisions = 0;
    for (const [mfr, smartDriver] of Object.entries(smartMap)) {
      if (newMap[mfr] && newMap[mfr] !== smartDriver) {
        console.log(`  ❌ COLLISION: ${mfr}`);
        console.log(`       smart_fingerprints: ${smartDriver}`);
        console.log(`       new_fingerprints:   ${newMap[mfr]}`);
        collisions++;
        errors++;
      }
    }

    if (collisions === 0) {
      console.log('  ✅ No fingerprint collisions found between smart/new fingerprints');
    } else {
      console.log(`\n  Found ${collisions} collision(s) — these MUST be resolved!`);
    }
  } else {
    console.log('  ⚠️  Fingerprint files not found, skipping collision check');
  }
} catch (err) {
  console.log(`  ⚠️  Fingerprint check error: ${err.message}`);
}

// --- Summary ---
console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`  AUDIT COMPLETE: ${audited} drivers scanned`);
console.log(`  ❌ Errors:   ${errors}`);
console.log(`  ⚠️  Warnings: ${warnings}`);
console.log('═══════════════════════════════════════════════════════════════');

process.exit(errors > 0 ? 1 : 0);
