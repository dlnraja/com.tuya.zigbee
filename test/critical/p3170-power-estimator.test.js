'use strict';
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const PE = require('../../lib/energy/PowerEstimator');
const Mixin = require('../../lib/mixins/VirtualEnergyMeterMixin');

describe('P3170 power estimation', () => {
  it('linear model: dim 0 is standby-ish, not full power; off = standby', () => {
    assert.strictEqual(PE.estimateWatts({ on: true, dim: 0, ratedW: 10, standbyW: 0.4 }), 0.4);
    assert.strictEqual(PE.estimateWatts({ on: true, dim: 0.5, ratedW: 10.4, standbyW: 0.4 }), 5.4);
    assert.strictEqual(PE.estimateWatts({ on: false, dim: 1, ratedW: 10, standbyW: 0.4 }), 0.4);
    assert.strictEqual(PE.estimateWatts({ on: true, dim: null, ratedW: 9 }), 9);
  });
  it('LUT interpolation and empty sourced registry (no invented couples)', () => {
    assert.strictEqual(PE.interpolate([[0, 1], [1, 11]], 0.5), 6);
    assert.strictEqual(PE.lutFor('_TZ3000_x', 'TS0505B'), null);
    assert.deepStrictEqual(Object.keys(PE.LUT_PROFILES), []);
  });
  it('integration: gap capped, never decreasing', () => {
    assert.strictEqual(PE.integrateKwh(1, 1000, 3600000), 1 + 1000 * PE.MAX_GAP_MS / 3600000 / 1000);
    assert.strictEqual(PE.integrateKwh(2, -50, 60000), 2);
    assert.strictEqual(PE.integrateKwh(2, 100, -5), 2);
  });
  it('mixin: dim 0 while on books standby, meter_power keeps store floor', async () => {
    const caps = { onoff: true, dim: 0, meter_power: null, measure_power: null };
    const store = { nominal_power: 10, virtual_meter_kwh_floor: 5 };
    const set = {};
    const dev = Object.assign(Object.create(Mixin), {
      driver: { id: 'plug_smart' }, _virtualEnergyActive: true, _virtualVoltage: 230,
      _virtualEnergyLastUpdate: Date.now() - 60000,
      getCapabilities: () => Object.keys(caps), hasCapability: (c) => c in caps,
      getCapabilityValue: (c) => caps[c], getStoreValue: (k) => store[k],
      setStoreValue: async (k, v) => { store[k] = v; }, getSetting: () => null,
      _setEstimatedCap: async (c, v) => { set[c] = v; },
    });
    await dev._updateVirtualEnergy();
    assert.strictEqual(set.measure_power, 0.4);
    assert.ok(set.meter_power >= 5, `meter_power ${set.meter_power} fell below floor`);
  });
});
