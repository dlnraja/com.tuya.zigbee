'use strict';
const assert = require('assert');
const E = require('../lib/energy/EstimatedEnergyCaps');

describe('P3130 EstimatedEnergyCaps', () => {
  it('adds estimated caps after the audit, retrying instead of giving up', async () => {
    const caps = new Set(['onoff']); const opts = {}; let audit = false; const timers = [];
    const dev = {
      smartEnergy: { isAuditComplete: () => audit, isRealCapability: () => false },
      getSetting: () => true,
      hasCapability: (c) => caps.has(c),
      addCapability: async (c) => { caps.add(c); },
      getCapabilityOptions: (c) => opts[c] || {},
      setCapabilityOptions: async (c, o) => { opts[c] = o; },
    };
    assert.strictEqual(await E.ensure(dev, { setTimeoutFn: (fn) => timers.push(fn) }), 'wait');
    assert.strictEqual(caps.has('measure_power'), false);
    audit = true; await timers[0]();
    await new Promise((r) => setImmediate(r));
    assert.ok(caps.has('measure_power') && caps.has('meter_power'));
    assert.strictEqual(opts.measure_power.approximated, true);
    assert.strictEqual(await E.ensure({ ...dev, getSetting: () => false }), 'disabled');
  });
});
