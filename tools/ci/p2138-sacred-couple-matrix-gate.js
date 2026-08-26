#!/usr/bin/env node
'use strict';

/**
 * P2138 / sacred-couple matrix gate (HomeSuite + PresentSky lessons)
 *
 * Enforces runtime + catalog rules that workflows must not regress:
 * 1. Identity is always manufacturerName + productId (never mfr-only invent).
 * 2. One MFS can map to many PIDs / variants — refuse wrong-PID catalog force.
 * 3. BSEED Click wall dimmer lock: *_m1cvyneb + TS0601 → wall_dimmer_tuya only.
 * 4. Same MFS + unknown/wrong PID (e.g. TS0201) → null (no climate invent).
 * 5. PRODUCT_ID_DEFAULTS.TS0201 / TS0207 / TS011F must not invent a driver.
 * 6. Brightness scale helper must clamp 0–1000 (lib/tuya/TuyaBrightnessScale.js).
 * 7. Anti-bot forbidden drivers for m1cvyneb must stay listed.
 *
 * Usage: node tools/ci/p2138-sacred-couple-matrix-gate.js
 * Exit 0 = pass, 1 = fail
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const failures = [];

function ok(msg) {
  console.log(`  ✅ ${msg}`);
}

function fail(msg) {
  failures.push(msg);
  console.error(`  ❌ ${msg}`);
}

function mustExist(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) fail(`missing file: ${rel}`);
  else ok(`exists ${rel}`);
  return p;
}

console.log('P2138 sacred-couple matrix gate\n');

mustExist('lib/tuya/TuyaBrightnessScale.js');
mustExist('lib/tuya/DeviceFingerprintDB.js');
mustExist('lib/DeviceFingerprintDB.js');
mustExist('drivers/wall_dimmer_tuya/device.js');
mustExist('drivers/wall_dimmer_tuya/driver.compose.json');
mustExist('test/critical/p2138-bseed-wall-dimmer.test.js');
mustExist('test/critical/poll-control-policy.test.js');
mustExist('tools/ci/anti-bot-regression-gate.js');
mustExist('tools/ci/layer-coverage-gate.js');
mustExist('tools/ci/audit-sacred-couple.js');

let getDriverId;
let DeviceFingerprintDB;
try {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  ({ getDriverId } = require(path.join(ROOT, 'lib', 'tuya', 'DeviceFingerprintDB.js')));
  // eslint-disable-next-line import/no-dynamic-require, global-require
  DeviceFingerprintDB = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB.js'));
} catch (e) {
  fail(`fingerprint DB require failed: ${e.message}`);
}

if (typeof getDriverId === 'function') {
  const dimmer = getDriverId('_TZE284_m1cvyneb', 'TS0601');
  if (dimmer === 'wall_dimmer_tuya') ok('getDriverId(m1cvyneb, TS0601) → wall_dimmer_tuya');
  else fail(`getDriverId(m1cvyneb, TS0601) expected wall_dimmer_tuya, got ${JSON.stringify(dimmer)}`);

  for (const badPid of ['TS0201', 'TS0202', 'TS0001']) {
    const got = getDriverId('_TZE284_m1cvyneb', badPid);
    if (got == null) ok(`getDriverId(m1cvyneb, ${badPid}) → null (no invent)`);
    else fail(`getDriverId(m1cvyneb, ${badPid}) must be null, got ${JSON.stringify(got)}`);
  }

  for (const mfr of ['_TZE204_m1cvyneb', '_TZE200_m1cvyneb']) {
    const d = getDriverId(mfr, 'TS0601');
    if (d === 'wall_dimmer_tuya') ok(`getDriverId(${mfr}, TS0601) → wall_dimmer_tuya`);
    else fail(`getDriverId(${mfr}, TS0601) expected wall_dimmer_tuya, got ${JSON.stringify(d)}`);
  }
} else {
  fail('lib/tuya/DeviceFingerprintDB.getDriverId missing');
}

if (DeviceFingerprintDB && typeof DeviceFingerprintDB.lookup === 'function') {
  const hit = DeviceFingerprintDB.lookup('_TZE284_m1cvyneb', 'TS0601');
  if (hit && hit.driver === 'wall_dimmer_tuya') ok('DeviceFingerprintDB.lookup(m1cvyneb, TS0601) → wall_dimmer_tuya');
  else fail(`DeviceFingerprintDB.lookup(m1cvyneb, TS0601) failed: ${JSON.stringify(hit && hit.driver)}`);

  const miss = DeviceFingerprintDB.lookup('_TZE284_m1cvyneb', 'TS0201');
  // May return productId_default with driver:null — never wall_dimmer / climate invent
  const badDrivers = ['wall_dimmer_tuya', 'climate_sensor', 'soil_sensor', 'zigbee_universal'];
  if (!miss || miss.driver == null || !badDrivers.includes(miss.driver)) {
    ok('DeviceFingerprintDB.lookup(m1cvyneb, TS0201) does not invent dimmer/climate');
  } else {
    fail(`lookup(m1cvyneb, TS0201) invented driver ${miss.driver}`);
  }
} else {
  fail('DeviceFingerprintDB.lookup missing');
}

try {
  const src = fs.readFileSync(path.join(ROOT, 'lib', 'DeviceFingerprintDB.js'), 'utf8');
  if (/'TS0201':\s*\{[^}]*driver:\s*null/.test(src)) {
    ok('PRODUCT_ID_DEFAULTS.TS0201.driver === null (no invent)');
  } else {
    fail('PRODUCT_ID_DEFAULTS.TS0201 must set driver: null');
  }
  if (/'TS0207':\s*\{[^}]*driver:\s*null/.test(src)) {
    ok('PRODUCT_ID_DEFAULTS.TS0207.driver === null (water vs repeater vs rain)');
  } else {
    fail('PRODUCT_ID_DEFAULTS.TS0207 must set driver: null (ambiguous pid)');
  }
  if (/'TS011F':\s*\{[^}]*driver:\s*null/.test(src)) {
    ok('PRODUCT_ID_DEFAULTS.TS011F.driver === null (plug vs DIN vs strip)');
  } else {
    fail('PRODUCT_ID_DEFAULTS.TS011F must set driver: null (ambiguous pid)');
  }
  const compoundHits = [
    ['_TZ3000_k4ej3ww2', 'TS0207', 'water_leak_sensor'],
    ['_TZ3000_5k5vh43t', 'TS0207', 'zigbee_repeater'],
    ['_TZ3000_okaz9tjs', 'TS011F', 'plug_energy_monitor'],
    ['_TZE284_nt4pquef', 'TS0601', 'soil_sensor'],
    ['_TZE284_6ocnqlhn', 'TS0601', 'din_rail_meter'],
    ['_TZ3000_mrpevh8p', 'TS0041', 'button_wireless_1'],
    ['_TZ3000_zgyzgdua', 'TS0044', 'scene_switch_4'],
  ];
  for (const [mfr, pid, driver] of compoundHits) {
    const hit = DeviceFingerprintDB.lookup(mfr, pid);
    if (hit && hit.driver === driver) ok(`compound ${mfr}+${pid} → ${driver}`);
    else fail(`compound ${mfr}+${pid} expected ${driver}, got ${JSON.stringify(hit && hit.driver)}`);
  }
} catch (e) {
  fail(`read DeviceFingerprintDB: ${e.message}`);
}

try {
  const compose = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'drivers', 'wall_dimmer_tuya', 'driver.compose.json'), 'utf8'),
  );
  const mfrs = compose.zigbee?.manufacturerName || [];
  const pids = compose.zigbee?.productId || [];
  if (mfrs.some((m) => String(m).toLowerCase().includes('m1cvyneb'))) ok('wall_dimmer_tuya compose lists m1cvyneb');
  else fail('wall_dimmer_tuya compose missing m1cvyneb');
  if (pids.map(String).includes('TS0601')) ok('wall_dimmer_tuya productId includes TS0601');
  else fail('wall_dimmer_tuya productId must include TS0601');
} catch (e) {
  fail(`wall_dimmer compose: ${e.message}`);
}

try {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const scale = require(path.join(ROOT, 'lib', 'tuya', 'TuyaBrightnessScale.js'));
  if (typeof scale.toTuyaBrightness !== 'function' || typeof scale.fromTuyaBrightness !== 'function') {
    fail('TuyaBrightnessScale missing toTuyaBrightness/fromTuyaBrightness');
  } else {
    const up = scale.toTuyaBrightness(0.5);
    const down = scale.fromTuyaBrightness(500);
    if (up === 500 && Math.abs(down - 0.5) < 0.001) ok('TuyaBrightnessScale 0.5 ↔ 500');
    else fail(`TuyaBrightnessScale roundtrip failed: ${up} / ${down}`);
    const clampHi = scale.toTuyaBrightness(2);
    const clampLo = scale.toTuyaBrightness(-1);
    if (clampHi === 1000 && clampLo === 0) ok('TuyaBrightnessScale clamps to 0–1000');
    else fail(`TuyaBrightnessScale clamp failed: ${clampLo}..${clampHi}`);
  }
} catch (e) {
  fail(`TuyaBrightnessScale: ${e.message}`);
}

try {
  const bot = fs.readFileSync(path.join(ROOT, 'tools', 'ci', 'anti-bot-regression-gate.js'), 'utf8');
  const need = ['m1cvyneb', 'climate_sensor', 'soil_sensor', 'zigbee_universal', 'wall_dimmer'];
  for (const n of need) {
    if (bot.toLowerCase().includes(n.toLowerCase())) ok(`anti-bot mentions ${n}`);
    else fail(`anti-bot-regression-gate.js must mention ${n}`);
  }
} catch (e) {
  fail(`anti-bot read: ${e.message}`);
}

try {
  const mfsPath = path.join(ROOT, 'data', 'mfs_db.json');
  if (fs.existsSync(mfsPath)) {
    const db = JSON.parse(fs.readFileSync(mfsPath));
    let bad = 0;
    const scan = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      const m = String(obj.manufacturerName || obj.mfr || obj.manufacturer || '').toLowerCase();
      const p = String(obj.productId || obj.modelId || obj.modelID || obj.pid || '');
      if (m.includes('m1cvyneb') && p === 'TS0201') bad += 1;
    };
    if (Array.isArray(db)) db.forEach(scan);
    else if (typeof db === 'object') {
      for (const [k, v] of Object.entries(db)) {
        if (/m1cvyneb/i.test(k) && /TS0201/i.test(k)) bad += 1;
        scan(v);
      }
    }
    if (bad === 0) ok('mfs_db has no m1cvyneb|TS0201 invent');
    else fail(`mfs_db still has ${bad} m1cvyneb|TS0201 invent entr(y/ies)`);
  } else {
    ok('mfs_db.json absent in this checkout (skip invent scan)');
  }
} catch (e) {
  fail(`mfs_db scan: ${e.message}`);
}

console.log('');
if (failures.length) {
  console.error(`FAIL: ${failures.length} check(s) failed`);
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log('PASS: P2138 sacred-couple matrix gate');
process.exit(0);
