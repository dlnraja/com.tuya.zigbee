'use strict';
/* global describe, it */
// P3426: PJ-MGW1203 / PJ-1203-W clamp _TZE204/_TZE284/_TZE28C1000000_cjbofhxw (Z2M tuya.ts @ed29f80): DP18 A/1000,
// DP19 W/10, DP20 V/10, DP101 = energy of the last interval added to a running kWh total. Parallel RX: until
// DP18/19/20 is seen, DP101 stays on the legacy PJ-1203A decode.
const assert = require('assert');
const path = require('path');
const Cls = require(path.join(__dirname, '../../drivers/power_clamp_meter/device.js'));
const P = Cls.prototype;

function fake(mfr) {
  const store = {};
  const caps = {};
  const ctx = {
    _cachedMfr: mfr,
    getSetting: () => '',
    getStoreValue: (k) => store[k],
    setStoreValue: async (k, v) => { store[k] = v; },
    hasCapability: () => true,
    getCapabilityValue: (c) => caps[c],
    safeSetCapabilityValue: async (c, v) => { caps[c] = v; },
  };
  for (const m of ['_p3426IsMgw1203Mfr', '_p3426MgwActive', '_p3426Set', '_p3426AddEnergy', '_p3426HandleMgw1203']) {ctx[m] = P[m].bind(ctx);}
  return { ctx, caps, store };
}

describe('P3426 PJ-MGW1203 clamp decode', () => {
  it('DP101 before any DP18/19/20 keeps the legacy path', () => {
    const { ctx } = fake('_TZE204_cjbofhxw');
    assert.strictEqual(ctx._p3426HandleMgw1203(101, 50), false);
  });
  it('DP18/19/20 scale, then DP101 accumulates kWh', () => {
    const { ctx, caps } = fake('_TZE284_cjbofhxw');
    assert.ok(ctx._p3426HandleMgw1203(18, 1234));
    assert.ok(ctx._p3426HandleMgw1203(19, 2305));
    assert.ok(ctx._p3426HandleMgw1203(20, 2301));
    assert.strictEqual(caps.measure_current, 1.234);
    assert.strictEqual(caps.measure_power, 230.5);
    assert.strictEqual(caps.measure_voltage, 230.1);
    ctx._p3426HandleMgw1203(101, 120);
    ctx._p3426HandleMgw1203(101, 80);
    assert.strictEqual(caps.meter_power, 0.2);
  });
  it('other clamps are untouched', () => {
    const { ctx } = fake('_TZE204_81yrt3lo');
    assert.strictEqual(ctx._p3426HandleMgw1203(19, 2305), false);
  });
});
