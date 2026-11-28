'use strict';
/* global describe, it */
// P3425: Nous E12 CO alarm _TZE284_sonkaxrd (Z2M nous.ts E12) lives on co_sensor, not climate_sensor, and DP1 enum 0
// means CO alarm (zhc trueFalseEnum0).
const assert = require('assert');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const lc = (id) => new Set(require(path.join(ROOT, 'drivers', id, 'driver.compose.json')).zigbee.manufacturerName.map((m) => m.toLowerCase()));
const app = require(path.join(ROOT, 'app.json'));
const appLc = (id) => new Set(app.drivers.find((d) => d.id === id).zigbee.manufacturerName.map((m) => m.toLowerCase()));

describe('P3425 Nous E12 on co_sensor', () => {
  it('both zhc spellings are on co_sensor (compose + app.json) and gone from climate_sensor', () => {
    for (const m of ['_tze284_sonkaxrd', '_tze2841000000_sonkaxrd']) {
      assert.ok(lc('co_sensor').has(m) && appLc('co_sensor').has(m), m);
    }
    assert.ok(!lc('climate_sensor').has('_tze284_sonkaxrd') && !appLc('climate_sensor').has('_tze284_sonkaxrd'));
    assert.ok(require(path.join(ROOT, 'drivers/co_sensor/driver.compose.json')).zigbee.productId.includes('TS0601'));
  });
  it('DP map: enum 0 = alarm, enum 1 = normal, DP2 ppm, no tamper on DP9', () => {
    const Cls = require(path.join(ROOT, 'drivers/co_sensor/device.js'));
    const map = Object.getOwnPropertyDescriptor(Cls.prototype, 'dpMappings').get.call({
      _isSmokeOnly: () => false, _isNousE12: () => true,
    });
    assert.strictEqual(map[1].capability, 'alarm_co');
    assert.strictEqual(map[1].transform(0), true);
    assert.strictEqual(map[1].transform(1), false);
    assert.strictEqual(map[2].capability, 'measure_co');
    assert.strictEqual(map[9], undefined);
  });
  it('other CO sensors keep the generic map', () => {
    const Cls = require(path.join(ROOT, 'drivers/co_sensor/device.js'));
    const map = Object.getOwnPropertyDescriptor(Cls.prototype, 'dpMappings').get.call({ _isSmokeOnly: () => false, _isNousE12: () => false });
    assert.strictEqual(map[9].capability, 'alarm_tamper');
  });
});
