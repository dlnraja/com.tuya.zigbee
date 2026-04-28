/**
 * Script: add-missing-fingerprints.js
 * Purpose: Add missing fingerprints for issues #275, #260
 * Date: 2026-04-27
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FINGERPRINTS_PATH = path.join(__dirname, '..', 'data', 'fingerprints.json');

console.log('=== Adding Missing Fingerprints ===\n');

// Load fingerprints
const fingerprints = JSON.parse(fs.readFileSync(FINGERPRINTS_PATH, 'utf8'));

// New fingerprints to add
const newFingerprints = {
  // Issue #275: Immax NEO Smart Water Timer - _TZE200_xlppj4f5
  '_TZE200_xlppj4f5|TS0601': {
    'driver': 'device_radiator_valve_hybrid',
    'profile': 'valve',
    'description': 'Immax NEO Smart Water Timer'
  },
  
  // Issue #260: Insoma Two Way Irrigation Valve - _TZE284_fhvpaltk
  '_TZE284_fhvpaltk|TS0601': {
    'driver': 'device_radiator_valve_hybrid',
    'profile': 'valve',
    'description': 'Insoma Two Way Irrigation Valve'
  },
  
  // Ensure TZE284_rqcuwlsa has a direct fingerprint (may already exist)
  '_TZE284_rqcuwlsa|TS0601': {
    'driver': 'soil_sensor',
    'profile': 'sensor',
    'description': 'Smart Solar Soil Sensor (direct match)'
  },
  
  // Issue #184: Temperature & humidity sensor with external probe
  '_TZE284_8se38w3c|TS0601': {
    'driver': 'sensor_climate_temphumidsensor_hybrid',
    'profile': 'sensor',
    'description': 'Temperature & Humidity Sensor with external probe'
  },
  
  // Issue #170: TS0003
  '_TZ3000_v4l4b0lp|TS0003': {
    'driver': 'switch_3gang',
    'profile': 'switch',
    'description': 'TS0003 3 Gang Switch'
  },
  
  // Issue #194: plug_energy_monitor
  'CK-BL702-SWP-01(7020)|': {
    'driver': 'plug_energy_monitor',
    'profile': 'socket',
    'description': 'CK-BL702-SWP-01(7020) Energy Monitor Plug'
  }
};

let added = 0;
let skipped = 0;

for (const [key, value] of Object.entries(newFingerprints)) {
  if (fingerprints[key]) {
    console.log(`SKIP: ${key} (already exists)`);
    skipped++;
  } else {
    fingerprints[key] = value;
    console.log(`ADDED: ${key} -> ${value.driver} (${value.description})`);
    added++;
  }
}

// Sort keys for consistency
const sortedKeys = Object.keys(fingerprints).sort();
const sortedFingerprints = {};
sortedKeys.forEach(key => {
  sortedFingerprints[key] = fingerprints[key];
});

// Save updated fingerprints
fs.writeFileSync(FINGERPRINTS_PATH, JSON.stringify(sortedFingerprints, null, 2));
console.log(`\n=== Summary ===`);
console.log(`Added: ${added}`);
console.log(`Skipped: ${skipped}`);
console.log(`Total fingerprints: ${Object.keys(sortedFingerprints).length}`);
console.log(`\nFingerprints file updated: ${FINGERPRINTS_PATH}`);
