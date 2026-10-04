'use strict';
/* eslint-env mocha */
// #113: log-only action cards gain a real effect through the device's own capability listener.
const assert = require('assert');
const W = require('../lib/flow/PlaceholderActionWiring');

function fakeDevice(caps, values = {}, opts = {}) {
  const calls = [];
  return {
    calls,
    getName: () => 'dev',
    hasCapability: (c) => caps.includes(c),
    getCapabilityValue: (c) => values[c],
    getCapabilityOptions: (c) => opts[c] || {},
    getSetting: () => undefined,
    triggerCapabilityListener: async (c, v) => { if (opts.fail) { throw new Error('timeout'); } calls.push([c, v]); },
    safeSetCapabilityValue: async () => {},
  };
}
const driver = { log() {} };

describe('PlaceholderActionWiring (#113)', () => {
  it('every mapped card has a known op', () => {
    const ops = new Set(['cover', 'cover_favorite', 'bool_cap', 'enum_cap', 'step_cap', 'method']);
    for (const [id, s] of Object.entries(W._loadMap())) { assert.ok(ops.has(s.op), id); }
  });
  it('child lock goes through the child_lock capability listener', async () => {
    const d = fakeDevice(['child_lock']);
    assert.strictEqual(await W.run(driver, 'thermostat_tuya_dp_set_child_lock', { device: d, enabled: 'true' }), true);
    assert.deepStrictEqual(d.calls, [['child_lock', true]]);
  });
  it('temperature step is clamped to the capability range', async () => {
    const d = fakeDevice(['target_temperature'], { target_temperature: 29 }, { target_temperature: { min: 5, max: 30 } });
    await W.run(driver, 'thermostat_tuya_dp_increase_temperature', { device: d, degrees: 3 });
    assert.deepStrictEqual(d.calls, [['target_temperature', 30]]);
  });
  it('missing capability keeps the old silent success', async () => {
    const d = fakeDevice([]);
    assert.strictEqual(await W.run(driver, 'thermostat_tuya_dp_set_child_lock', { device: d, enabled: 'true' }), true);
    assert.deepStrictEqual(d.calls, []);
  });
  it('unmapped card keeps the old silent success', async () => {
    const d = fakeDevice(['onoff']);
    assert.strictEqual(await W.run(driver, 'no_such_card', { device: d }), true);
  });
  it('a real command failure is reported clearly', async () => {
    const d = fakeDevice(['child_lock'], {}, { fail: true });
    await assert.rejects(W.run(driver, 'thermostat_tuya_dp_set_child_lock', { device: d, enabled: 'false' }), /did not accept/);
  });
});
