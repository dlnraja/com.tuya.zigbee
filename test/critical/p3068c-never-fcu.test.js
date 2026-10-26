'use strict';
// P3068c (t568u): _TZE204_0hcjew5p pilot-wire thermostats wrongly armed as FCU before P3067 keep their
// capabilities (no removal) but fan_mode/thermostat_mode are no longer driven and are labelled unused.
require('../_support/homey-stub').install();
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

describe('P3068 0hcjew5p wrongly armed as FCU', () => {
  const Dev = require(path.join(ROOT, 'drivers/wall_thermostat/device.js'));
  const mk = (mfr, store) => {
    const opts = {};
    const d = Object.create(Dev.prototype);
    Object.assign(d, {
      getSetting: (k) => k === 'zb_manufacturer_name' ? mfr : null, getSettings: () => ({ zb_manufacturer_name: mfr }),
      getStoreValue: (k) => store[k], setStoreValue: async (k, v) => { store[k] = v; }, getData: () => ({}), log: () => {},
      hasCapability: (c) => c === 'fan_mode' || c === 'thermostat_mode',
      setCapabilityOptions: async (c, o) => { opts[c] = o; },
      addCapability: async () => { throw new Error('no add'); }, removeCapability: async () => { throw new Error('no removal'); },
    });
    return { d, opts };
  };
  it('a stored FCU flag no longer arms the FCU path for 0hcjew5p, but still does for a real FCU', async () => {
    const a = mk('_TZE204_0hcjew5p', { wall_thermo_fcu: true });
    assert.strictEqual(a.d._isFcuCouple(), false);
    await a.d._armFcu('dp28');
    assert.ok(!a.d._fcu);
    const b = mk('_TZE204_other', { wall_thermo_fcu: true });
    assert.strictEqual(b.d._isFcuCouple(), true);
  });
  it('capabilities are kept and labelled unused once (no removal)', async () => {
    const store = { wall_thermo_fcu: true };
    const a = mk('_tze204_0hcjew5p', store);
    a.d._markFcuCapsUnused();
    await new Promise((r) => setTimeout(r, 5));
    assert.strictEqual(a.opts.fan_mode.preventInsights, true);
    assert.ok(/unused/.test(a.opts.thermostat_mode.title.en));
    assert.strictEqual(store.wall_thermo_fcu_unused_marked, true);
  });
});
