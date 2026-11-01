'use strict';
const assert = require('assert');
const E = require('../lib/energy/EstimatedEnergyCaps');

describe('P3130 EstimatedEnergyCaps', () => {
  it('adds estimated caps after the audit, re-checked at audit end instead of giving up', async () => {
    const caps = new Set(['onoff']); const opts = {}; let audit = false;
    const dev = {
      smartEnergy: { isAuditComplete: () => audit, isRealCapability: () => false },
      getSetting: () => true,
      hasCapability: (c) => caps.has(c),
      addCapability: async (c) => { caps.add(c); },
      getCapabilityOptions: (c) => opts[c] || {},
      setCapabilityOptions: async (c, o) => { opts[c] = o; },
    };
    assert.strictEqual(await E.ensure(dev), 'wait');
    assert.strictEqual(dev._p3130WantEstimated, true);
    assert.strictEqual(caps.has('measure_power'), false);
    audit = true; await E.ensureOnce(dev); // what _finalizeAudit does
    assert.ok(caps.has('measure_power') && caps.has('meter_power'));
    assert.strictEqual(opts.measure_power.approximated, true);
    assert.strictEqual(await E.ensure({ ...dev, getSetting: () => false }), 'disabled');
  });
});
