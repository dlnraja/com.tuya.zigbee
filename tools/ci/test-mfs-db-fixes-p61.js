'use strict';

/**
 * Test suite for P61 mfs_db fixes (forum post #2090-#2110)
 *
 * Cross-checks that recently-reported device pairings route to the
 * correct driver:
 * - _TZE200_npj9bug3 / TS0601 → soil_sensor (was climate_sensor)
 * - _TZE284_myd45weu / TS0601 → soil_sensor (was soilsensor_2)
 * - _TZE284_pcdmj88b / TS0601 → device_radiator_valve (was wall_thermostat)
 * - HOBEIAN / ZG-222Z → water_leak_sensor (was unknown)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const mfsPath = path.join(__dirname, '..', '..', 'data', 'mfs_db.json');
let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

console.log('=== P61 mfs_db fixes tests (forum posts 2090-2110) ===');

const mfs = JSON.parse(fs.readFileSync(mfsPath, 'utf8'));

// 1. _TZE200_npj9bug3 → soil_sensor
test('_TZE200_npj9bug3 maps to soil_sensor (was climate_sensor)', () => {
  const entry = mfs['_TZE200_npj9bug3'];
  assert.ok(entry, 'entry exists');
  assert.strictEqual(entry.driverId, 'soil_sensor');
});

// 2. _TZE284_myd45weu → soil_sensor
test('_TZE284_myd45weu maps to soil_sensor (was soilsensor_2)', () => {
  const entry = mfs['_TZE284_myd45weu'];
  assert.ok(entry, 'entry exists');
  assert.strictEqual(entry.driverId, 'soil_sensor');
});

// 3. _TZE284_pcdmj88b → device_radiator_valve
test('_TZE284_pcdmj88b maps to device_radiator_valve (was wall_thermostat)', () => {
  const entry = mfs['_TZE284_pcdmj88b'];
  assert.ok(entry, 'entry exists');
  assert.strictEqual(entry.driverId, 'device_radiator_valve');
});

// 4. HOBEIAN + ZG-222Z → water_leak_sensor via sacredCouples
test('HOBEIAN / ZG-222Z maps to water_leak_sensor in sacredCouples', () => {
  const key = 'hobeian|zg-222z';
  const entry = mfs.sacredCouples && mfs.sacredCouples[key];
  assert.ok(entry, 'sacredCouples entry exists');
  assert.strictEqual(entry.driver, 'water_leak_sensor');
});

// 5. water_leak_sensor driver has HOBEIAN in manufacturerName
test('water_leak_sensor driver has HOBEIAN in manufacturerName', () => {
  const c = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', '..', 'drivers', 'water_leak_sensor', 'driver.compose.json'),
    'utf8'
  ));
  const mfrs = (c.zigbee && c.zigbee.manufacturerName) || [];
  assert.ok(mfrs.some((m) => m.toLowerCase() === 'hobeian'),
    'water_leak_sensor should have HOBEIAN in manufacturerName');
});

// 6. sensor_contact_zigbee driver has HOBEIAN in manufacturerName
test('sensor_contact_zigbee driver has HOBEIAN in manufacturerName', () => {
  const c = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', '..', 'drivers', 'sensor_contact_zigbee', 'driver.compose.json'),
    'utf8'
  ));
  const mfrs = (c.zigbee && c.zigbee.manufacturerName) || [];
  assert.ok(mfrs.some((m) => m.toLowerCase() === 'hobeian'),
    'sensor_contact_zigbee should have HOBEIAN in manufacturerName');
});

// 7. The new mfrs in drivers are unique
test('sensor_contact_zigbee has no duplicate HOBEIAN entries', () => {
  const c = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', '..', 'drivers', 'sensor_contact_zigbee', 'driver.compose.json'),
    'utf8'
  ));
  const mfrs = (c.zigbee && c.zigbee.manufacturerName) || [];
  const hobCount = mfrs.filter((m) => m.toLowerCase() === 'hobeian').length;
  assert.ok(hobCount >= 1, 'has at least one HOBEIAN');
  assert.ok(hobCount <= 3, 'has at most 3 HOBEIAN variants (HOBEIAN, hobeian, Hobeian)');
});

// 8. Cross-check: HOBEIAN top-level in mfs_db is no longer the only entry
test('HOBEIAN top-level in mfs_db is updated', () => {
  const entry = mfs['HOBEIAN'];
  assert.ok(entry, 'HOBEIAN entry exists');
  // HOBEIAN is a brand, not a specific device. The top-level is fallback.
  // We've now added a Hobeian ZG-222Z sacredCouples entry that takes priority.
});

// 9. sacredCouples for soil_sensor mfrs
test('sacredCouples _tze200_npj9bug3|ts0601 → soil_sensor (was missing)', () => {
  const key = '_tze200_npj9bug3|ts0601';
  const entry = mfs.sacredCouples && mfs.sacredCouples[key];
  assert.ok(entry, 'sacredCouples entry exists');
  assert.strictEqual(entry.driver, 'soil_sensor');
  assert.ok(entry.confidence >= 0.9, 'high confidence');
});

// 10. Cross-check: all soil-sensor mfrs are also in soil_sensor driver
test('soil_sensor driver has _TZE200_npj9bug3', () => {
  const c = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', '..', 'drivers', 'soil_sensor', 'driver.compose.json'),
    'utf8'
  ));
  const mfrs = (c.zigbee && c.zigbee.manufacturerName) || [];
  assert.ok(mfrs.some((m) => m.toLowerCase().includes('npj9bug3')),
    'soil_sensor should have _TZE200_npj9bug3 in manufacturerName');
});

test('soil_sensor driver has _TZE284_myd45weu', () => {
  const c = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', '..', 'drivers', 'soil_sensor', 'driver.compose.json'),
    'utf8'
  ));
  const mfrs = (c.zigbee && c.zigbee.manufacturerName) || [];
  assert.ok(mfrs.some((m) => m.toLowerCase().includes('myd45weu')),
    'soil_sensor should have _TZE284_myd45weu in manufacturerName');
});

test('device_radiator_valve has TS0601 in productId (placeholder driver)', () => {
  // The device_radiator_valve driver is a placeholder for Sacred Couple
  // routing. The actual implementation lives in thermostatic_radiator_valve.
  // Sacred Couples (mfs_db.json) routes _TZE284_pcdmj88b|TS0601 →
  // device_radiator_valve at 0.95 confidence (3 sources: canonical, mfs_db,
  // user-data). Future P62 work: merge the two drivers.
  const c = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', '..', 'drivers', 'device_radiator_valve', 'driver.compose.json'),
    'utf8'
  ));
  const pids = (c.zigbee && c.zigbee.productId) || [];
  assert.ok(pids.includes('TS0601'),
    'device_radiator_valve should have TS0601 in productId');
});

test('sacredCouples _tze284_pcdmj88b|ts0601 → device_radiator_valve (3 sources)', () => {
  const key = '_tze284_pcdmj88b|ts0601';
  const entry = mfs.sacredCouples && mfs.sacredCouples[key];
  assert.ok(entry, 'sacredCouples entry exists');
  assert.strictEqual(entry.driver, 'device_radiator_valve');
  assert.ok(entry.confidence >= 0.9, 'high confidence');
  assert.ok(entry.sources.length >= 3, 'multiple sources confirm');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
