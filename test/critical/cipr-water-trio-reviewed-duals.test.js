'use strict';
/* eslint-env mocha */
// CI-PR 2026-10-27: P3077 batch 19 took the TS0207 water leak trio off water_leak_sensor_tuya.
// The reviewed-duals record must follow, and the exact couples must stay on water_leak_sensor.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

describe('CI-PR water leak trio reviewed duals', () => {
  const trio = ['_TZ3000_kstbkt6a', '_TZ3000_fxvjhdyl', '_TZ3000_kyb656no'];
  it('keeps the exact TS0207 couples on water_leak_sensor', () => {
    const z = read('drivers/water_leak_sensor/driver.compose.json').zigbee;
    const mfrs = z.manufacturerName.map((m) => m.toLowerCase());
    assert.ok([].concat(z.productId).includes('TS0207'));
    for (const m of trio) assert.ok(mfrs.includes(m.toLowerCase()), m);
  });
  it('no reviewed entry for the trio still lists water_leak_sensor_tuya', () => {
    for (const e of read('data/native-matrix-reviewed-duals.json').entries) {
      if (trio.some((m) => e.couple === `${m}|TS0207`)) {
        assert.deepStrictEqual(e.drivers, ['water_leak_sensor']);
        assert.ok(e.superseded_by);
      }
    }
  });
});
