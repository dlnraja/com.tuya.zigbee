'use strict';
/**
 * fix-climate-sensor-fps.js
 * Adds ALL fingerprints from lib/tuya/fingerprints.json (driverId=climate_sensor)
 * that are missing from drivers/climate_sensor/driver.compose.json
 * Uses exact same match logic as verify_fingerprints_integrity.js
 */
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const FP_PATH      = path.join(ROOT, 'lib/tuya/fingerprints.json');
const COMPOSE_PATH = path.join(ROOT, 'drivers/climate_sensor/driver.compose.json');

const fp       = JSON.parse(fs.readFileSync(FP_PATH, 'utf8'));
const compose  = JSON.parse(fs.readFileSync(COMPOSE_PATH, 'utf8'));
const rawBefore = fs.readFileSync(COMPOSE_PATH, 'utf8');

// Collect all fps for this driver that use the validator's exact include check
const missing = [];
for (const [fingerprint, config] of Object.entries(fp)) {
  if (config.driverId !== 'climate_sensor') continue;
  const searchStr = '"' + fingerprint + '"';
  if (!rawBefore.includes(searchStr)) {
    missing.push(fingerprint);
  }
}

console.log('[FIX] Missing from climate_sensor:', missing.length);
if (missing.length === 0) {
  console.log('[OK] Nothing to fix.');
  process.exit(0);
}

// Add missing ones
const mfrs = new Set(compose.zigbee.manufacturerName);
for (const f of missing) mfrs.add(f);
compose.zigbee.manufacturerName = [...mfrs].sort();

// Atomic write: write to .atomic then rename
const json = JSON.stringify(compose, null, 2) + '\n';
const tmp  = COMPOSE_PATH + '.atomic';
fs.writeFileSync(tmp, json, 'utf8');
// Validate before rename
JSON.parse(fs.readFileSync(tmp, 'utf8'));
fs.renameSync(tmp, COMPOSE_PATH);

// Verify
const newRaw = fs.readFileSync(COMPOSE_PATH, 'utf8');
const stillMissing = missing.filter(f => !newRaw.includes('"' + f + '"'));
if (stillMissing.length > 0) {
  console.error('[ERROR] Still missing after fix:', stillMissing);
  process.exit(1);
}
console.log('[OK] Fixed', missing.length, 'fingerprints. Total entries:', compose.zigbee.manufacturerName.length);
