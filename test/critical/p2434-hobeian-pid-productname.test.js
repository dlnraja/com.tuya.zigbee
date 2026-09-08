'use strict';

/**
 * P2434 — HOBEIAN as productId + product name (not mfr-only)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

function compose(id) {
  return JSON.parse(fs.readFileSync(
    path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}

function testComposePid() {
  for (const id of [
    'presence_sensor_radar',
    'soil_sensor',
    'climate_sensor',
    'switch_1gang',
    'siren',
    'water_leak_sensor',
  ]) {
    const j = compose(id);
    const pids = (j.zigbee.productId || []).map((p) => String(p));
    const mfrs = (j.zigbee.manufacturerName || []).map((m) => String(m));
    assert.ok(pids.includes('HOBEIAN'), `${id} productId needs HOBEIAN`);
    assert.ok(pids.includes('hobeian'), `${id} productId needs hobeian`);
    assert.ok(mfrs.includes('HOBEIAN'), `${id} mfr needs HOBEIAN`);
  }
}

function testMfsProductNames() {
  const mfs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mfs_db.json'), 'utf8'));
  const h = mfs.HOBEIAN;
  assert.ok(h.multiCouple);
  assert.ok(Array.isArray(h.productNames));
  assert.ok(h.productNames.includes('HOBEIAN'));
  assert.ok(h.deviceNames.includes('HOBEIAN'));
  assert.ok(!h.modelIds.includes('HOBEIAN'), 'modelIds stay real Zigbee pids only');
  assert.ok(h.deviceNamesByPid['ZG-204ZM'].some((n) => /HOBEIAN/i.test(n)));
}

function testMfrHelperNormalize() {
  const src = fs.readFileSync(
    path.join(ROOT, 'lib/helpers/ManufacturerNameHelper.js'), 'utf8');
  assert.match(src, /P2434/);
  assert.match(src, /modelUpper === 'HOBEIAN'/);
}

function testTuyaUtils() {
  const src = fs.readFileSync(path.join(ROOT, 'lib/utils/tuyaUtils.js'), 'utf8');
  assert.match(src, /modelId: 'HOBEIAN'/);
}

function main() {
  testComposePid();
  testMfsProductNames();
  testMfrHelperNormalize();
  testTuyaUtils();
  console.log('P2434 HOBEIAN pid + productName gates OK');
}

main();
