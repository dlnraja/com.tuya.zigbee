/**
 * fix-bulk-collisions.js
 * 
 * Batch fix remaining true cross-driver collisions after air_purifier fix.
 * Strategy: for each MFR collision pair, remove from the less specific / broader driver.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function readCompose(driverName) {
  const p = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeCompose(driverName, compose) {
  const p = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  fs.writeFileSync(p, JSON.stringify(compose, null, 2) + '\n', 'utf8');
}

function removeMfrsFromDriver(driverName, mfrsToRemove, reason) {
  const compose = readCompose(driverName);
  if (!compose) {
    console.log(`  ⚠️  Driver ${driverName} not found, skipping`);
    return 0;
  }

  const original = compose.zigbee?.manufacturerName || [];
  const removeSet = new Set(mfrsToRemove.map(m => m.toLowerCase()));
  const filtered = original.filter(m => !removeSet.has(m.toLowerCase()));
  const removed = original.length - filtered.length;

  if (removed > 0) {
    compose.zigbee.manufacturerName = filtered;
    writeCompose(driverName, compose);
    console.log(`  ✅ ${driverName}: removed ${removed} MFR(s) — ${reason}`);
  } else {
    console.log(`  ℹ️  ${driverName}: nothing to remove (already clean)`);
  }
  return removed;
}

// ============================================================
// FIX GROUPS
// ============================================================

let totalFixed = 0;

console.log('\n=== Bulk Collision Fixer ===\n');

// --- 1. bulb_dimmable vs bulb_dimmable_dimmer ---
// _TZ3000_noru9tix is in both — keep in bulb_dimmable (main driver), remove from bulb_dimmable_dimmer
console.log('Group 1: bulb_dimmable vs bulb_dimmable_dimmer');
totalFixed += removeMfrsFromDriver('bulb_dimmable_dimmer', ['_TZ3000_noru9tix'], 
  '_TZ3000_noru9tix belongs to bulb_dimmable (main dimmable)');

// --- 2. bulb_dimmable vs dimmer_wall_1gang ---
// _TYZB01_QEZUIN6K (dimmer wall MFR) — keep in dimmer_wall_1gang, remove from bulb_dimmable
console.log('\nGroup 2: bulb_dimmable vs dimmer_wall_1gang');
totalFixed += removeMfrsFromDriver('bulb_dimmable', 
  ['_tyzb01_qezuin6k', '_TYZB01_QEZUIN6K', '_TYZB01_qezuin6k'],
  '_TYZB01_QEZUIN6K is a wall dimmer, not a bulb');

// --- 3. bulb_dimmable vs dimmer_dual_channel ---
// _tyzb01_v8gtiaed in both — keep in dimmer_dual_channel (specific), remove from bulb_dimmable
console.log('\nGroup 3: bulb_dimmable vs dimmer_dual_channel');
totalFixed += removeMfrsFromDriver('bulb_dimmable', 
  ['_tyzb01_v8gtiaed', '_TYZB01_V8GTIAED'],
  '_TYZB01_V8GTIAED is a dual channel dimmer');

// --- 4. air_quality_co2 vs dimmer_wall_1gang ---
// _TZ3210_guijtl8k, _TZ3210_hquixjeg — these are CO2 sensors, remove from dimmer_wall_1gang
console.log('\nGroup 4: air_quality_co2 vs dimmer_wall_1gang');
totalFixed += removeMfrsFromDriver('dimmer_wall_1gang', 
  ['_TZ3210_guijtl8k', '_TZ3210_hquixjeg'],
  'These are CO2 sensor MFRs, not dimmers');

// --- 5. air_quality_co2 vs smart_air_detection_box ---
// Keep in smart_air_detection_box if TS0601_co2 is specific there
console.log('\nGroup 5: air_quality_co2 vs smart_air_detection_box (TS0601_co2)');
// Check which driver has TS0601_co2 as PID
const co2compose = readCompose('smart_air_detection_box');
const co2pids = co2compose?.zigbee?.productId || [];
if (co2pids.includes('TS0601_co2')) {
  console.log('  ℹ️  smart_air_detection_box already has TS0601_co2 PID — collision is PID-level, no MFR fix needed');
}

// --- 6. dimmer_wall_1gang vs air_quality_co2 (second pair) ---
// _TZ3210_ prefix MFRs — CO2/air sensors, remove from dimmer_wall_1gang
console.log('\nGroup 6: Additional CO2 MFRs in dimmer_wall_1gang');
const dimmerCompose = readCompose('dimmer_wall_1gang');
if (dimmerCompose) {
  const co2Mfrs = (dimmerCompose.zigbee?.manufacturerName || []).filter(m => 
    m.startsWith('_TZ3210_') || m.startsWith('_TZ32_')
  );
  if (co2Mfrs.length > 0) {
    console.log(`  Found ${co2Mfrs.length} _TZ3210_ MFRs in dimmer_wall_1gang — checking if they are in CO2 driver...`);
    const co2Driver = readCompose('air_quality_co2');
    const co2DriverMfrs = new Set((co2Driver?.zigbee?.manufacturerName || []).map(m => m.toLowerCase()));
    const toRemove = co2Mfrs.filter(m => co2DriverMfrs.has(m.toLowerCase()));
    if (toRemove.length > 0) {
      totalFixed += removeMfrsFromDriver('dimmer_wall_1gang', toRemove, 'CO2 sensor MFRs, not dimmers');
    } else {
      console.log('  ℹ️  No confirmed CO2/dimmer cross-collisions found');
    }
  }
}

// --- 7. Summary ---
console.log(`\n=============================`);
console.log(`Total MFRs fixed across all drivers: ${totalFixed}`);
console.log('');
console.log('Validation: running JSON parse check...');

const driverNames = ['bulb_dimmable', 'bulb_dimmable_dimmer', 'dimmer_wall_1gang', 
                     'air_quality_co2', 'air_quality_comprehensive', 'smart_air_detection_box'];

let allValid = true;
for (const name of driverNames) {
  const p = path.join(DRIVERS_DIR, name, 'driver.compose.json');
  if (!fs.existsSync(p)) continue;
  try {
    JSON.parse(fs.readFileSync(p, 'utf8'));
    console.log(`  ✅ ${name}: JSON valid`);
  } catch (e) {
    console.error(`  ❌ ${name}: JSON INVALID — ${e.message}`);
    allValid = false;
  }
}

if (allValid) {
  console.log('\n✅ All driver compose files are valid JSON');
} else {
  console.error('\n❌ Some drivers have invalid JSON!');
  process.exit(1);
}
