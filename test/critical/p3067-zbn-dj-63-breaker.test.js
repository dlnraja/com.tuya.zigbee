'use strict';
// P3067 family 9: _TZE204_lb0fsvba = Tuya ZBN-DJ-63 smart circuit breaker (Z2M tuya.ts: DP1 energy /100,
// DP6 phaseVariant2, DP9 fault bitmap, DP16 state, DP103 temperature, DP15 leakage mA, DP110 reverse energy /100).
// Its TS0601 couple moved from lcdtemphumidsensor_3 to smart_breaker.
require('../_support/homey-stub').install();
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const app = require(path.join(ROOT, 'app.json'));
const Breaker = require(path.join(ROOT, 'drivers/smart_breaker/device.js'));
const Lcd3 = require(path.join(ROOT, 'drivers/lcdtemphumidsensor_3/device.js'));

function owners(mfr) {
  return app.drivers.filter((d) => d.zigbee && d.zigbee.manufacturerName.some((m) => m.toLowerCase() === mfr)).map((d) => d.id);
}
function fake(Cls, mfr) {
  const caps = {};
  const store = {};
  const d = Object.create(Cls.prototype);
  Object.assign(d, {
    getSetting: (k) => (k === 'zb_manufacturer_name' ? mfr : undefined),
    getStoreValue: (k) => store[k], setStoreValue: async (k, v) => { store[k] = v; },
    log: () => {}, error: () => {},
    hasCapability: (c) => c in caps || c !== 'measure_temperature',
    addCapability: async (c) => { caps[c] = null; },
    safeSetCapabilityValue: async (c, v) => { caps[c] = v; },
    setCapabilityValue: async (c, v) => { caps[c] = v; },
  });
  return { d, caps, store };
}
const tick = () => new Promise((r) => setTimeout(r, 10));

describe('P3067 ZBN-DJ-63 breaker', () => {
  it('_TZE204_lb0fsvba is owned by smart_breaker only, with TS0601', () => {
    assert.deepStrictEqual(owners('_tze204_lb0fsvba'), ['smart_breaker']);
    assert.ok(app.drivers.find((d) => d.id === 'smart_breaker').zigbee.productId.includes('TS0601'));
  });
  it('DP map: DP1 energy /100, DP9 fault bitmap, DP16 switch', () => {
    const { d } = fake(Breaker, '_TZE204_lb0fsvba');
    const m = d.dpMappings;
    assert.strictEqual(m[1].capability, 'meter_power');
    assert.strictEqual(m[1].divisor, 100);
    assert.strictEqual(m[9].transform(0), false);
    assert.strictEqual(m[9].transform(4), true);
    assert.strictEqual(m[16].capability, 'onoff');
  });
  it('DP6 phase struct feeds V/A/W, DP103 adds temperature late, DP15/DP110 go to the store', async () => {
    const { d, caps, store } = fake(Breaker, '_TZE204_lb0fsvba');
    d._handleDP(6, Buffer.from([0x09, 0x10, 0x00, 0x03, 0xe8, 0x00, 0x00, 0xe6]));
    d._handleDP(103, 35);
    d._handleDP(15, 12);
    d._handleDP(110, 250);
    await tick();
    assert.strictEqual(caps.measure_voltage, 232);
    assert.strictEqual(caps.measure_current, 1);
    assert.strictEqual(caps.measure_power, 230);
    assert.strictEqual(caps.measure_temperature, 35);
    assert.strictEqual(store.leakage_current_ma, 12);
    assert.strictEqual(store.reverse_energy_kwh, 2.5);
  });
  it('units already paired on lcdtemphumidsensor_3 drop the breaker DPs', async () => {
    const { d, caps } = fake(Lcd3, '_TZE204_lb0fsvba');
    await d.processResponse({ dp: 1, datatype: 2, data: Buffer.from([0, 0, 0x30, 0x39]) });
    assert.deepStrictEqual(caps, {});
  });
});
