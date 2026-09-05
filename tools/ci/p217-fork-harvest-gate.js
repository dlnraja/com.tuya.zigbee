#!/usr/bin/env node
'use strict';

/**
 * P217 fork / alternative-app harvest gate
 *
 * WHY: JohanBendz PRs #1435/#1437/#1439/#1442 and sister forks shipped
 * verified (mfr+pid) couples that we had in the wrong driver or not at all.
 * Homey pairing is compose cartesian — lock compound DB + forbidden placements.
 *
 * Usage: node tools/ci/p217-fork-harvest-gate.js
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

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function hasMfr(compose, mfr) {
  const list = (compose.zigbee && compose.zigbee.manufacturerName) || [];
  const needle = String(mfr).toLowerCase();
  return list.some((x) => String(x).toLowerCase() === needle);
}

function hasPid(compose, pid) {
  const list = (compose.zigbee && compose.zigbee.productId) || [];
  return list.some((x) => String(x).toLowerCase() === String(pid).toLowerCase());
}

console.log('P217 fork harvest sacred-couple gate\n');

const { getDriverId } = require(path.join(ROOT, 'lib', 'tuya', 'DeviceFingerprintDB.js'));
const DeviceFingerprintDB = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB.js'));

const garage = readJson('drivers/garage_door/driver.compose.json');
const buttonPlug = readJson('drivers/button_wireless_plug/driver.compose.json');
const dpp2 = readJson('drivers/double_power_point_2/driver.compose.json');
const sw1 = readJson('drivers/switch_1gang/driver.compose.json');
const contact = readJson('drivers/contact_sensor/driver.compose.json');
const climate = readJson('drivers/climate_sensor/driver.compose.json');
const sw2 = readJson('drivers/switch_2gang/driver.compose.json');
const btn2 = readJson('drivers/button_wireless_2/driver.compose.json');

if (hasMfr(garage, '_TZE200_wfxuhoea') && hasPid(garage, 'TS0601')) {
  ok('garage_door has _TZE200_wfxuhoea + TS0601');
} else fail('garage_door missing LoraTap couple');

if (!hasMfr(buttonPlug, '_TZE200_wfxuhoea')) ok('button_wireless_plug does not claim wfxuhoea');
else fail('button_wireless_plug still has _TZE200_wfxuhoea');

if (hasMfr(dpp2, '_TZ3000_k6fvknrr') && hasPid(dpp2, 'TS011F')) {
  ok('double_power_point_2 has _TZ3000_k6fvknrr + TS011F');
} else fail('double_power_point_2 missing k6fvknrr couple');

if (!hasMfr(sw1, '_TZ3000_k6fvknrr')) ok('switch_1gang does not claim k6fvknrr');
else fail('switch_1gang still has _TZ3000_k6fvknrr');

if (hasMfr(contact, 'Wing') && hasPid(contact, 'TS0203')) ok('contact_sensor has Wing + TS0203');
else fail('contact_sensor missing Wing+TS0203');

if (hasMfr(climate, 'Wing') && (hasPid(climate, 'ZTH11-3.0') || hasPid(climate, 'ZTH13-3.0'))) {
  ok('climate_sensor has Wing + ZTH productId');
} else fail('climate_sensor missing Wing ZTH productIds');

if (hasMfr(sw2, 'HOBEIAN') && hasPid(sw2, 'ZG-305Z')) ok('switch_2gang has HOBEIAN + ZG-305Z');
else fail('switch_2gang missing HOBEIAN+ZG-305Z');

if (!hasPid(btn2, 'ZG-305Z')) ok('button_wireless_2 no longer claims ZG-305Z');
else fail('button_wireless_2 still has productId ZG-305Z');

const routes = [
  ['_TZE200_wfxuhoea', 'TS0601', 'garage_door'],
  ['_TZ3000_k6fvknrr', 'TS011F', 'double_power_point_2'],
  ['Wing', 'TS0203', 'contact_sensor'],
  ['Wing', 'ZTH11-3.0', 'climate_sensor'],
  ['HOBEIAN', 'ZG-305Z', 'switch_2gang'],
];

for (const [mfr, pid, driver] of routes) {
  const got = getDriverId(mfr, pid);
  if (got === driver) ok(`getDriverId(${mfr}, ${pid}) → ${driver}`);
  else fail(`getDriverId(${mfr}, ${pid}) expected ${driver}, got ${JSON.stringify(got)}`);
}

const ts0203 = DeviceFingerprintDB.lookup('unknown-brand', 'TS0203');
if (ts0203 && ts0203.driver === 'contact_sensor') ok('TS0203 pid default is contact_sensor (not water leak)');
else fail(`TS0203 default expected contact_sensor, got ${JSON.stringify(ts0203 && ts0203.driver)}`);

const cover = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedCoverBase.js'), 'utf8');
if (cover.includes('_isDooyaDp1CommandMotor')) ok('UnifiedCoverBase has Dooya DP1 command path');
else fail('UnifiedCoverBase missing Dooya DP1 command helper');

const conflictSrc = fs.readFileSync(path.join(ROOT, 'scripts/automation/fix-fingerprint-conflicts.js'), 'utf8');
if (conflictSrc.includes('isPidDisambiguatedBrand') && /hobeian/.test(conflictSrc)) {
  ok('conflict resolver skips pid-disambiguated brands (HOBEIAN/Wing)');
} else fail('fix-fingerprint-conflicts.js missing HOBEIAN/Wing skip');

if (failures.length) {
  console.error(`\nP217 FAIL (${failures.length})`);
  process.exit(1);
}
console.log('\nP217 PASS');
process.exit(0);
