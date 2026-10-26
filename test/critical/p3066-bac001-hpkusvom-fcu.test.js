'use strict';
// P3066: _TZE204_hpkusvom (Z2M tuya.ts BAC-001) runs the FCU path from init: DP2 = cool/heat/fan_only, DP28 fan.
require('../_support/homey-stub').install();
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const Device = require(path.join(ROOT, 'drivers/wall_thermostat/device.js'));

function fake(mfr) {
  const d = Object.create(Device.prototype);
  Object.assign(d, {
    getSetting: (k) => k === 'zb_manufacturer_name' ? mfr : k === 'zb_model_id' ? 'TS0601' : null,
    getStoreValue: () => null, getStore: () => ({}), getData: () => ({}), log: () => {},
  });
  return d;
}

describe('P3066 BAC-001 hpkusvom FCU', () => {
  it('hpkusvom is an FCU couple, the BHT couples are not', () => {
    assert.ok(Device.FCU_MFRS.includes('_TZE204_hpkusvom'));
    assert.strictEqual(fake('_TZE204_hpkusvom')._isFcuCouple(), true);
    assert.strictEqual(fake('_TZE204_aoclfnxz')._isFcuCouple(), false);
  });
  it('the couple is hosted by wall_thermostat', () => {
    const c = require(path.join(ROOT, 'drivers/wall_thermostat/driver.compose.json'));
    assert.ok(c.zigbee.manufacturerName.includes('_TZE204_hpkusvom'));
  });
});
