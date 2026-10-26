'use strict';
// WHY(#570/#571, 2026-10-13): driver lists keep the device-reported padded form
// "AOYAN  " (additive, exact couple). Runtime identity must still resolve the
// trimmed brand, so the padded entry can never split one device into two keys.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const H = require(path.join(ROOT, 'lib/helpers/ManufacturerNameHelper.js'));
const FM = require(path.join(ROOT, 'lib/utils/fingerprint-matcher.js'));

describe('P2810 padded manufacturerName read-time normalization', () => {
  it('helper trims a padded zb_manufacturer_name', () => {
    const dev = { getSetting: (k) => (k === 'zb_manufacturer_name' ? 'AOYAN  ' : null) };
    assert.equal(H.getManufacturerName(dev), 'AOYAN');
  });
  it('matcher key is identical for padded and plain forms', () => {
    assert.equal(FM.normalizeMfr('AOYAN  ').key, FM.normalizeMfr('AOYAN').key);
  });
  it('soil_sensor keeps both exact forms (additive, never deleted)', () => {
    const c = require(path.join(ROOT, 'drivers/soil_sensor/driver.compose.json'));
    for (const f of ['AOYAN', 'AOYAN  ', '_TZE284_myd45weu']) assert.ok(c.zigbee.manufacturerName.includes(f), f);
    for (const p of ['AY-303Z', 'TS0601']) assert.ok(c.zigbee.productId.includes(p), p);
  });
});
