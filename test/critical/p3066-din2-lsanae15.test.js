'use strict';
// P3066: _TZE200/_TZE204_lsanae15 = Z2M TS0601_din_2 (tuya.ts): DP1 energy /100, DP6 phaseVariant2, DP16 relay.
require('../_support/homey-stub').install();
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const Device = require(path.join(ROOT, 'drivers/energy_meter_din/device.js'));

function fake(mfr) {
  const set = {};
  const sent = [];
  const d = Object.create(Device.prototype);
  Object.assign(d, {
    getSetting: (k) => k === 'zb_manufacturer_name' ? mfr : null,
    getStore: () => ({}), getData: () => ({}),
    hasCapability: () => true,
    safeSetCapabilityValue: async (c, v) => { set[c] = v; },
    log: () => {},
    tuyaEF00Manager: { sendDP: async (dp, v, t) => { sent.push([dp, v, t]); } },
  });
  return { d, set, sent };
}

describe('P3066 DIN_2 lsanae15 decode', () => {
  it('decodes the packed DP6 like Z2M phaseVariant2', () => {
    const buf = Buffer.from([0x08, 0xfc, 0x00, 0x01, 0xf4, 0x00, 0x00, 0x64]);
    assert.deepStrictEqual(Device.decodeDin2Phase(buf), { voltage: 230, current: 0.5, power: 100 });
    assert.deepStrictEqual(Device.decodeDin2Phase(buf.toString('base64')), { voltage: 230, current: 0.5, power: 100 });
    assert.strictEqual(Device.decodeDin2Phase(Buffer.from([1, 2])), null);
  });
  it('lsanae15: DP1 is energy (not the relay), DP16 is the relay, onoff writes DP16', async () => {
    const { d, set, sent } = fake('_TZE204_lsanae15');
    d._handleDP(1, 12345);
    d._handleDP(16, true);
    d._handleDP(6, Buffer.from([0x08, 0xfc, 0x00, 0x01, 0xf4, 0x00, 0x00, 0x64]));
    await new Promise((r) => setImmediate(r));
    assert.strictEqual(set.meter_power, 123.45);
    assert.strictEqual(set.onoff, true);
    assert.strictEqual(set.measure_voltage, 230);
    await d._setOnOff(false);
    assert.deepStrictEqual(sent, [[16, 0, 'bool']]);
  });
  it('other DIN meters keep the existing layout', () => {
    const { d } = fake('_TZE204_d2zfgtij');
    assert.strictEqual(d._isDin2(), false);
  });
});
