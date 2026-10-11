'use strict';
// VicHY MTG075 (forum 140352) Advanced Flow lag: provenance UX must not rewrite capability options
// on every sample, and a measured sample must not undo a deliberate preventInsights: true.
const test = require('node:test');
const assert = require('node:assert');
const DP = require('../../lib/telemetry/DataProvenance');

function fakeDevice(opts) {
  const store = {};
  const options = { ...opts };
  const calls = [];
  return {
    calls, options,
    hasCapability: () => true,
    getCapabilityOptions: (c) => options[c] || {},
    setCapabilityOptions: async (c, o) => { calls.push(c); options[c] = o; },
    getStoreValue: async (k) => store[k],
    setStoreValue: async (k, v) => { store[k] = v; },
  };
}

test('measured samples do not rewrite options repeatedly', async () => {
  const d = fakeDevice({ alarm_motion: { preventInsights: true, title: { en: 'Motion alarm' } } });
  for (let i = 0; i < 20; i++) { await DP.stampProvenance(d, 'alarm_motion', 'measured', { applyUx: true }); }
  assert.strictEqual(d.calls.length, 0);
  assert.strictEqual(d.options.alarm_motion.preventInsights, true);
});

test('estimated → measured still restores Insights once', async () => {
  const d = fakeDevice({ measure_power: { preventInsights: true, title: { en: 'Power' }, units: 'W' } });
  await DP.stampProvenance(d, 'measure_power', 'estimated', { applyUx: true });
  await DP.stampProvenance(d, 'measure_power', 'measured', { applyUx: true });
  await DP.stampProvenance(d, 'measure_power', 'measured', { applyUx: true });
  assert.strictEqual(d.options.measure_power.preventInsights, false);
  assert.ok(d.calls.length <= 2);
});
