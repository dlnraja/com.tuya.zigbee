'use strict';
const assert = require('assert');
const FFC = require('../lib/flow/FeatureFlowCards.js');
describe('auto shutdown (t/160624 idea)', () => {
  it('arms countdown on onoff=true, drops deleted devices', async () => {
    const store = {};
    const ctx = Object.create(FFC.prototype);
    ctx.homey = { settings: { get: (k) => store[k], set: (k, v) => { store[k] = v; } } };
    const dev = { id: 'd1', getData: () => ({ id: 'd1' }) };
    ctx._resolveDevice = (id) => (id === 'd1' ? dev : null);
    const calls = [];
    ctx._featureFallbackRouter = { getCountdownLeft: () => 0, countdown: async (d, s) => { calls.push(s); return { ok: true }; }, _endCountdown: () => calls.push('end') };
    ctx._autoShutdownSave({ d1: 5, gone: 3 });
    assert.deepStrictEqual(store.auto_shutdown_minutes, { d1: 5 });
    ctx._autoShutdownOnChange(dev, 'd1', 'onoff', true);
    ctx._autoShutdownOnChange(dev, 'd1', 'onoff', false);
    assert.deepStrictEqual(calls, [300, 'end']);
  });
});
