'use strict';

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const {
  isSetpointDp,
  isAmbientDp,
  ensureOnoffListener,
  ensureSetpointCapability,
} = require('../lib/utils/OnoffAndSetpointGuard');

function fakeDevice(caps) {
  const set = new Set(caps || []);
  const listeners = {};
  return {
    listeners,
    hasCapability: (c) => set.has(c),
    addCapability: async (c) => { set.add(c); },
    registerCapabilityListener: (c, fn) => { listeners[c] = fn; },
  };
}

describe('P3384 onoff listener and additive setpoint (forum 21313 #2763/#2820)', () => {
  it('registers an onoff listener once when the capability exists', async () => {
    const dev = fakeDevice(['onoff', 'measure_temperature']);
    const seen = [];
    assert.strictEqual(ensureOnoffListener(dev, (v) => seen.push(v)), true);
    assert.strictEqual(ensureOnoffListener(dev, (v) => seen.push(v)), false);
    await dev.listeners.onoff(true);
    assert.deepStrictEqual(seen, [true]);
  });

  it('does not register onoff when the capability is absent', () => {
    const dev = fakeDevice(['measure_temperature']);
    assert.strictEqual(ensureOnoffListener(dev, () => {}), false);
  });

  it('adds target_temperature when a known setpoint DP is seen', async () => {
    const dev = fakeDevice(['measure_temperature']);
    assert.strictEqual(isAmbientDp(117), true);
    assert.strictEqual(isSetpointDp(111), true);
    const ambient = await ensureSetpointCapability(dev, 117);
    assert.strictEqual(ambient.added, false);
    const added = await ensureSetpointCapability(dev, 111);
    assert.strictEqual(added.added, true);
    assert.strictEqual(dev.hasCapability('target_temperature'), true);
    assert.strictEqual(dev.hasCapability('measure_temperature'), true);
    const again = await ensureSetpointCapability(dev, 16);
    assert.strictEqual(again.added, false);
  });
});
