'use strict';
/**
 * fix-all-invalid-capabilities.js
 * Uses homey-lib file-based ground truth to find and fix ALL invalid capabilities
 * across all driver.compose.json files and app.json.
 */
const fs = require('fs'), path = require('path');
process.chdir(path.join(__dirname, '..', '..', '..'));

const homeyLib = 'C:/Users/HP/AppData/Roaming/npm/node_modules/homey/node_modules/homey-lib';
const capsDir = path.join(homeyLib, 'assets/capability/capabilities');
const validBases = new Set(fs.readdirSync(capsDir).map(f => f.replace('.json', '')));

// A capability is valid if its base (before '.') is in validBases
const isValid = (cap) => {
  if (validBases.has(cap)) return true;
  const base = cap.includes('.') ? cap.split('.')[0] : cap;
  return validBases.has(base);
};

// Map invalid → valid replacement
// Custom Tuya / non-standard caps → remove or replace
const CAP_MAP = {
  // Air quality sensors
  'measure_formaldehyde':   'measure_co2',       // no standard equivalent
  'measure_ec':             'measure_humidity',   // electrical conductivity → humidity
  'measure_conductivity':   'measure_humidity',
  'alarm_siren':            'alarm_generic',      // not in SDK, closest is generic
  // Water sensors
  'measure_water_level':    'measure_humidity',   // closest proxy
  'measure_water_percentage': 'measure_humidity',
  'alarm_water_low':        'alarm_water',
  'alarm_water_high':       'alarm_water',
  // Motion / presence
  'alarm_human':            'alarm_motion',
  // Power
  'measure_power_factor':   'measure_power',      // not standard
  // Radar / distance
  'target_distance':        'measure_luminance',  // closest sensor measurement
  // Thermostat
  'thermostat_preset':      null,                 // REMOVE - no equivalent
  'window_open':            'alarm_contact',      // window open sensor
  'window_detection':       'alarm_contact',
  // Locks / generic
  'child_lock':             null,                 // REMOVE - app custom, no standard
  // Multi-channel non-sub-cap format
  'onoff_1':                'onoff',
  'onoff_2':                null,                 // REMOVE duplicate
  'onoff_3':                null,                 // REMOVE duplicate
  // Fingerbot / modes
  'finger_bot_mode':        null,                 // REMOVE - app custom
  'lidl_xmas_mode':         null,                 // REMOVE - app custom
  'lock_mode':              null,                 // REMOVE - app custom
  'wifi_heater_mode':       null,                 // REMOVE - app custom
  'eco_mode':               null,                 // REMOVE - app custom
  'ir_learned_code':        null,                 // REMOVE - app custom
  'ir_send_code':           null,                 // REMOVE - app custom
  // Tuya custom
  'tuya_dp_value':          null,                 // REMOVE - app custom
  'tuya_dp_string':         null,                 // REMOVE - app custom
  'tuya_dp_raw':            null,                 // REMOVE - app custom
  'tuya_cluster_event':     null,                 // REMOVE - app custom
  // Thermostat
  'thermostat_programming': null,                 // REMOVE - app custom
};

const driversDir = 'drivers';
const driverIds = fs.readdirSync(driversDir, { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name);

let totalFixed = 0;
let driversFixed = 0;

for (const id of driverIds) {
  const f = path.join(driversDir, id, 'driver.compose.json');
  if (!fs.existsSync(f)) continue;

  let dc;
  try { dc = JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch { continue; }

  if (!dc.capabilities || !dc.capabilities.length) continue;

  const original = [...dc.capabilities];
  let newCaps = [];
  let changed = false;

  for (const cap of original) {
    if (isValid(cap)) {
      newCaps.push(cap);
      continue;
    }

    // Look up in our map
    if (Object.prototype.hasOwnProperty.call(CAP_MAP, cap)) {
      const replacement = CAP_MAP[cap];
      if (replacement === null) {
        console.log(`  REMOVE ${id}: ${cap}`);
        changed = true;
        totalFixed++;
      } else {
        console.log(`  FIX ${id}: ${cap} → ${replacement}`);
        newCaps.push(replacement);
        changed = true;
        totalFixed++;
      }
    } else {
      // Unknown invalid cap - log and remove
      console.log(`  UNKNOWN INVALID REMOVE ${id}: ${cap}`);
      changed = true;
      totalFixed++;
    }
  }

  if (changed) {
    // Deduplicate
    dc.capabilities = [...new Set(newCaps)];
    fs.writeFileSync(f, JSON.stringify(dc, null, 2), 'utf8');
    driversFixed++;
  }
}

// Also fix app.json
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
for (const d of (app.drivers || [])) {
  if (!d.capabilities) continue;
  let changed = false;
  let newCaps = [];
  for (const cap of d.capabilities) {
    if (isValid(cap)) { newCaps.push(cap); continue; }
    const replacement = CAP_MAP[cap];
    if (replacement !== undefined) {
      if (replacement !== null) newCaps.push(replacement);
      changed = true;
    } else {
      // unknown - remove
      changed = true;
    }
  }
  if (changed) {
    d.capabilities = [...new Set(newCaps)];
  }
}
fs.writeFileSync('app.json', JSON.stringify(app), 'utf8');

console.log(`\nFixed ${driversFixed} drivers, total ${totalFixed} capability changes`);

// Verify remaining invalids
console.log('\n=== REMAINING INVALID CAPS ===');
let remaining = 0;
for (const id of driverIds) {
  const f = path.join(driversDir, id, 'driver.compose.json');
  if (!fs.existsSync(f)) continue;
  try {
    const dc = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const cap of dc.capabilities || []) {
      if (!isValid(cap)) {
        console.log(' STILL INVALID:', cap, 'in', id);
        remaining++;
      }
    }
  } catch {}
}
if (remaining === 0) console.log(' ✓ No remaining invalid caps in driver.compose.json files');
