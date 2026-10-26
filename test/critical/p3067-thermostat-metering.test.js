'use strict';
// P3067: power metering DPs of 3 exact thermostat couples (zhc tuya.ts AETZ01_AC, TWC-R01, pilot-wire
// _TZE204_3regm3h6 family incl. _TZE204_0hcjew5p). Late capabilities only; the wall thermostat's DP101 (voltage)
// must not arm the FCU path.
require('../_support/homey-stub').install();
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const M = require(path.join(ROOT, 'lib/tuya/ThermostatMeteringDps'));
const tick = () => new Promise((r) => setTimeout(r, 5));

function fakeDev(proto, mfr, extra = {}) {
  const caps = new Set(); const vals = {};
  const d = Object.create(proto);
  Object.assign(d, {
    getSetting: (k) => k === 'zb_manufacturer_name' ? mfr : null, getSettings: () => ({ zb_manufacturer_name: mfr }),
    getStoreValue: () => null, getData: () => ({}), log: () => {}, error: () => {},
    hasCapability: (c) => caps.has(c), addCapability: async (c) => { caps.add(c); },
    safeSetCapabilityValue: async (c, v) => { vals[c] = v; }, setCapabilityValue: async (c, v) => { vals[c] = v; },
  }, extra);
  return { d, caps, vals };
}

describe('P3067 thermostat metering DPs', () => {
  it('decodes with the source scales, exact couples only (any case)', () => {
    assert.deepStrictEqual(M.decode('_TZE200_snfdqllf', 116, 850), { capability: 'measure_power', value: 850 });
    assert.deepStrictEqual(M.decode('_TZE204_ILZKXRAV', 115, 2301), { capability: 'measure_voltage', value: 230.1 });
    assert.deepStrictEqual(M.decode('_TZE204_0hcjew5p', 102, 4350), { capability: 'measure_current', value: 4.35 });
    assert.deepStrictEqual(M.decode('_TZE204_0hcjew5p', 107, 125), { capability: 'meter_power', value: 12.5 });
    assert.strictEqual(M.decode('_TZE204_3regm3h6', 107, 125), null); // not claimed here
    assert.strictEqual(M.decode('_TZE204_ilzkxrav', 2, 1), null);
    assert.strictEqual(M.decode('_TZE204_ilzkxrav', 11, -5).value, null);
  });

  it('radiator valve driver: ilzkxrav DP117 → meter_power late-added; another TRV DP117 untouched', async () => {
    const Dev = require(path.join(ROOT, 'drivers/device_radiator_valve/device.js'));
    const a = fakeDev(Dev.prototype, '_TZE204_ilzkxrav');
    assert.strictEqual(a.d._handleDP(117, 1234), undefined);
    await tick();
    assert.ok(a.caps.has('meter_power')); assert.strictEqual(a.vals.meter_power, 123.4);
    assert.strictEqual(M.handle(fakeDev(Dev.prototype, '_TZE200_other').d, '_TZE200_other', 117, 1), false);
  });

  it('wall thermostat: 0hcjew5p DP101 sets voltage and does not arm the FCU path', async () => {
    const Dev = require(path.join(ROOT, 'drivers/wall_thermostat/device.js'));
    const a = fakeDev(Dev.prototype, '_TZE204_0hcjew5p', { _armFcu: async () => { throw new Error('FCU armed'); } });
    await a.d.processResponse({ dp: 101, datatype: 2, data: Buffer.from([0, 0, 0x08, 0xfc]) });
    await tick();
    assert.strictEqual(a.vals.measure_voltage, 230);
    assert.ok(!a.d._fcu);
  });
});
