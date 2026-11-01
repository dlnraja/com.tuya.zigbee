'use strict';
const assert = require('assert');
const G = require('../lib/ui/TileStateGuard');

describe('P3130 TileStateGuard', () => {
  it('main onoff drives tile, secondary booleans do not', async () => {
    const vals = { onoff: false, 'onoff.gang2': true, child_lock: true, dim: 0.5, alarm_tamper: false };
    const opts = {};
    const dev = {
      homey: { version: '13.5.2' },
      getCapabilities: () => Object.keys(vals).concat('button.1'),
      getCapabilityValue: (c) => vals[c],
      getCapabilityOptions: (c) => opts[c] || {},
      setCapabilityOptions: async (c, o) => { opts[c] = o; },
    };
    assert.strictEqual(await G.apply(dev), 3);
    assert.deepStrictEqual(opts, { onoff: { uiState: true }, 'onoff.gang2': { uiState: false }, child_lock: { uiState: false } });
    assert.strictEqual(await G.apply(dev), 0); // idempotent
    assert.strictEqual(await G.apply({ ...dev, homey: { version: '12.9.0' } }), 'old-homey');
    assert.deepStrictEqual(G.plan(['measure_temperature']), []);
  });
});
