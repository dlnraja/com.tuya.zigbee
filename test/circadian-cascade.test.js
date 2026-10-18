'use strict';

/**
 * Tests — CircadianEngine + MotionCascadeManager (v9.0.408, P92.110)
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const CircadianEngine = require('../lib/managers/CircadianEngine');
const MotionCascadeManager = require('../lib/managers/MotionCascadeManager');

function fakeSolar(elevation) {
  return { getElevation: () => elevation };
}

function fakeLight(id, caps = ['onoff', 'dim', 'light_color_temp']) {
  const values = {};
  return {
    id,
    getName: () => `Light ${id}`,
    hasCapability: (c) => caps.includes(c),
    getCapabilityValue: (c) => (c === 'onoff' ? true : values[c]),
    setCapabilityValue: async (c, v) => { values[c] = v; },
    _values: values,
  };
}

describe('CircadianEngine', () => {
  it('computes warm target at night and cold at noon', () => {
    const engine = new CircadianEngine(null, { solarElevation: fakeSolar(65) });
    const day = engine.computeTargets();
    assert.strictEqual(day.kelvin, 6500);
    const night = new CircadianEngine(null, { solarElevation: fakeSolar(-30) }).computeTargets();
    assert.strictEqual(night.kelvin, 2000);
    assert.ok(night.bright <= 0.1);
  });

  it('interpolates golden hour between 2700K and 4000K', () => {
    const engine = new CircadianEngine(null, { solarElevation: fakeSolar(9) });
    const t = engine.computeTargets();
    assert.ok(t.kelvin > 2700 && t.kelvin < 4000, `kelvin=${t.kelvin}`);
  });

  it('applies fading steps instead of jumps', async () => {
    const engine = new CircadianEngine(null, { solarElevation: fakeSolar(-30) });
    const light = fakeLight('a');
    engine.enable('a', light);
    engine._devices.get('a').currentKelvin = 6500; // état courant froid
    const res = await engine.applyNow();
    assert.strictEqual(res.kelvin, 2000);
    assert.strictEqual(engine._devices.get('a').currentKelvin, 6500 - 400); // pas de saut
    engine.destroy();
  });

  it('maps kelvin to Homey 0-1 warm value and brightness', async () => {
    const engine = new CircadianEngine(null, { solarElevation: fakeSolar(0) });
    const light = fakeLight('a');
    engine.enable('a', light);
    await engine.applyNow();
    assert.ok(light._values.light_color_temp > 0.8 && light._values.light_color_temp < 0.9); // 2700K → (6500-2700)/4500 ≈ 0.84
    assert.ok(Math.abs(light._values.dim - 0.3) < 0.01);
    engine.destroy();
  });

  it('does not adapt a light that is OFF', async () => {
    const engine = new CircadianEngine(null, { solarElevation: fakeSolar(65) });
    const light = fakeLight('a');
    light.getCapabilityValue = (c) => (c === 'onoff' ? false : undefined);
    engine.enable('a', light);
    await engine.applyNow();
    assert.strictEqual(light._values.light_color_temp, undefined);
    engine.destroy();
  });
});

describe('MotionCascadeManager', () => {
  it('link turns light on at motion and schedules auto-off', async () => {
    const mgr = new MotionCascadeManager(null);
    const light = fakeLight('L');
    mgr.link('motion1', light, { offMinutes: 1 });
    assert.strictEqual(mgr.isLinked('motion1'), true);
    await mgr.onMotion('motion1');
    assert.strictEqual(light._values.onoff, true);
    assert.ok(mgr._links.get('motion1').offTimer, 'auto-off programmé');
    mgr.destroy();
  });

  it('auto-off fires after delay (fake short timer)', async () => {
    const mgr = new MotionCascadeManager(null);
    const light = fakeLight('L');
    light._values.onoff = true;
    mgr.link('motion1', light, { offMinutes: 1 });
    const link = mgr._links.get('motion1');
    await mgr.onMotion('motion1');
    clearTimeout(link.offTimer);
    link.offTimer = null;
    await mgr._setOff(link.light);
    assert.strictEqual(light._values.onoff, false);
    mgr.destroy();
  });

  it('new motion resets the auto-off timer', async () => {
    const mgr = new MotionCascadeManager(null);
    const light = fakeLight('L');
    mgr.link('motion1', light, { offMinutes: 2 });
    await mgr.onMotion('motion1');
    const t1 = mgr._links.get('motion1').offTimer;
    await mgr.onMotion('motion1');
    const t2 = mgr._links.get('motion1').offTimer;
    assert.notStrictEqual(t1, t2);
    mgr.destroy();
  });

  it('unlink clears the pending auto-off', async () => {
    const mgr = new MotionCascadeManager(null);
    const light = fakeLight('L');
    mgr.link('motion1', light, {});
    await mgr.onMotion('motion1');
    mgr.unlink('motion1');
    assert.strictEqual(mgr.isLinked('motion1'), false);
    assert.strictEqual(mgr._links.size, 0);
    mgr.destroy();
  });

  it('dim option sets brightness before ON', async () => {
    const mgr = new MotionCascadeManager(null);
    const light = fakeLight('L');
    mgr.link('motion1', light, { dim: 0.2 });
    await mgr.onMotion('motion1');
    assert.strictEqual(light._values.dim, 0.2);
    assert.strictEqual(light._values.onoff, true);
    mgr.destroy();
  });
});
