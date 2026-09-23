'use strict';

/**
 * P2434 / P2692 — HOBEIAN brand identity
 *
 * Contre quoi: invent brand-as-productId (HOBEIAN/heobian in zigbee.productId)
 * → cartesian OCR collisions that block Auto-Publish.
 *
 * Doctrine: HOBEIAN = manufacturerName; real Zigbee modelIds = productId
 * (ZG-303Z soil, ZG-204ZM radar, …). mfs productNames may still list HOBEIAN.
 * Runtime helpers may normalize broken interviews that stuffed brand into modelId.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

function compose(id) {
  return JSON.parse(fs.readFileSync(
    path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}

function testComposeBrandNotPid() {
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
    assert.ok(mfrs.some((m) => m.toUpperCase() === 'HOBEIAN'), `${id} mfr needs HOBEIAN`);
    assert.ok(!pids.some((p) => /^hobeian$/i.test(p)), `${id} must not invent productId HOBEIAN`);
  }
  const soil = compose('soil_sensor');
  assert.ok((soil.zigbee.productId || []).includes('ZG-303Z'), 'soil couple pid ZG-303Z');
}

function testMfsProductNames() {
  const mfs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mfs_db.json'), 'utf8'));
  const key = Object.keys(mfs).find((k) => String(k).toUpperCase() === 'HOBEIAN');
  assert.ok(key, 'mfs_db has HOBEIAN brand entry');
  const h = mfs[key];
  assert.ok(h.multiCouple);
  assert.ok(Array.isArray(h.productNames));
  assert.ok(h.productNames.some((n) => String(n).toUpperCase() === 'HOBEIAN'));
  assert.ok(h.deviceNames.some((n) => String(n).toUpperCase() === 'HOBEIAN'));
  assert.ok(!h.modelIds.some((m) => String(m).toUpperCase() === 'HOBEIAN'), 'modelIds stay real Zigbee pids only');
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
  testComposeBrandNotPid();
  testMfsProductNames();
  testMfrHelperNormalize();
  testTuyaUtils();
  console.log('P2434 HOBEIAN brand (not invent-pid) gates OK');
}

main();
