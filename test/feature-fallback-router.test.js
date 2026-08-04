'use strict';

/**
 * Tests — FeatureFallbackRouter (v9.0.407, P92.109)
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const FeatureFallbackRouter = require('../lib/managers/FeatureFallbackRouter');

function deviceWithIdentify() {
  let called = 0;
  return {
    id: 'dev1',
    getName: () => 'Bulb 1',
    hasCapability: () => true,
    getCapabilityValue: () => true,
    setCapabilityValue: async () => {},
    zclNode: { endpoints: { 1: { clusters: {
      identify: { identify: async () => { called++; } },
      levelControl: { moveToLevelWithOnOff: async () => { called++; } },
    } } } },
    _called: () => called,
  };
}

function devicePlain() {
  const states = [];
  return {
    id: 'dev2',
    getName: () => 'Plug 1',
    hasCapability: (c) => c === 'onoff' || c === 'dim',
    getCapabilityValue: (c) => (c === 'onoff' ? false : 0.5),
    setCapabilityValue: async (c, v) => { states.push([c, v]); },
    _states: states,
  };
}

function deviceDP() {
  const dps = [];
  return {
    id: 'dev3',
    getName: () => 'Dimmer Tuya',
    hasCapability: (c) => c === 'dim',
    getCapabilityValue: () => 0.2,
    setCapabilityValue: async () => {},
    _sendTuyaDP: async (dp, v) => { dps.push([dp, v]); },
    _dps: dps,
  };
}

describe('FeatureFallbackRouter', () => {
  it('blink uses ZCL Identify when available', async () => {
    const r = new FeatureFallbackRouter(null);
    const dev = deviceWithIdentify();
    const res = await r.blink(dev, 5);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.path, 'zcl_identify');
    assert.strictEqual(dev._called(), 1);
  });

  it('blink falls back to software pulses with state restore', async () => {
    const r = new FeatureFallbackRouter(null);
    const dev = devicePlain();
    const res = await r.blink(dev, 2);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.path, 'software_pulses');
    const states = dev._states;
    assert.strictEqual(states[states.length - 1][1], false); // état restauré (était false)
  });

  it('smoothDim uses ZCL transition when available', async () => {
    const r = new FeatureFallbackRouter(null);
    const dev = deviceWithIdentify();
    const res = await r.smoothDim(dev, 80, 2000);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.path, 'zcl_transition');
  });

  it('smoothDim uses Tuya DP when no ZCL but DP available', async () => {
    const r = new FeatureFallbackRouter(null);
    const dev = deviceDP();
    const res = await r.smoothDim(dev, 60, 1000);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.path, 'tuya_dp');
    assert.deepStrictEqual(dev._dps[0], [2, 600]);
  });

  it('smoothDim falls back to software ramp reaching target', async () => {
    const r = new FeatureFallbackRouter(null);
    const dev = devicePlain();
    const res = await r.smoothDim(dev, 90, 400);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.path, 'software_ramp');
    const dims = dev._states.filter(([c]) => c === 'dim');
    assert.strictEqual(dims[dims.length - 1][1], 0.9);
  });

  it('countdown uses Tuya DP when available', async () => {
    const r = new FeatureFallbackRouter(null);
    const dev = deviceDP();
    const res = await r.countdown(dev, 120, 2);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.path, 'tuya_dp');
    assert.deepStrictEqual(dev._dps[0], [8, 120]); // gang2 → DP8
  });

  it('countdown falls back to software timer', async () => {
    const r = new FeatureFallbackRouter(null);
    const dev = devicePlain();
    const res = await r.countdown(dev, 60, 1);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.path, 'software_timer');
    assert.ok(r._cdTimers.size === 1);
    for (const t of r._cdTimers.values()) { clearTimeout(t); }
  });
});
