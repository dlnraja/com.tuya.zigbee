'use strict';
// P3400: driver-preference read ManagerSettings from require('homey') (SDK2 API, absent in SDK3),
// so a manual driver choice was never read nor stored. It now uses homey.settings (SDK3).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const pref = require('../../lib/utils/driver-preference');

function fakeHomey() {
  const store = {};
  return {
    store,
    settings: {
      get: (k) => store[k],
      set: (k, v) => { store[k] = JSON.parse(JSON.stringify(v)); },
    },
  };
}
function fakeDevice(id, homey) {
  return { homey, getData: () => ({ id }) };
}

describe('P3400 driver-preference uses SDK3 homey.settings', () => {
  it('no SDK2 ManagerSettings / require("homey") left', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../lib/utils/driver-preference.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    assert.ok(!/ManagerSettings/.test(src));
    assert.ok(!/require\(\s*['"]homey['"]\s*\)/.test(src));
  });
  it('set/get/clear round-trip through device.homey.settings', async () => {
    const h = fakeHomey();
    const dev = fakeDevice('dev-a', h);
    await pref.setUserPreferredDriver(dev, 'usb_outlet');
    assert.strictEqual(await pref.getUserPreferredDriver(dev), 'usb_outlet');
    assert.deepStrictEqual(h.store[pref.PREF_KEY], { 'dev-a': 'usb_outlet' });
    await pref.clearUserPreferredDriver(dev);
    assert.strictEqual(await pref.getUserPreferredDriver(dev), null);
  });
  it('legacy id-only calls work with an explicit homey or bindHomey()', async () => {
    const h = fakeHomey();
    await pref.setUserPreferredDriver('dev-b', 'plug_smart', h);
    assert.strictEqual(await pref.getUserPreferredDriver('dev-b', h), 'plug_smart');
    pref.bindHomey(h);
    try {
      assert.strictEqual(await pref.getUserPreferredDriver('dev-b'), 'plug_smart');
    } finally { pref.bindHomey(null); }
  });
  it('never throws without a settings store or with a broken one', async () => {
    assert.strictEqual(await pref.getUserPreferredDriver('dev-c'), null);
    assert.strictEqual(await pref.getUserPreferredDriver(null), null);
    await pref.setUserPreferredDriver('dev-c', 'x');
    await pref.clearUserPreferredDriver('dev-c');
    const broken = { settings: { get: () => { throw new Error('boom'); }, set: () => { throw new Error('boom'); } } };
    assert.strictEqual(await pref.getUserPreferredDriver(fakeDevice('d', broken)), null);
    await pref.setUserPreferredDriver(fakeDevice('d', broken), 'x');
    const odd = { settings: { get: () => 'garbage', set: () => {} } };
    assert.strictEqual(await pref.getUserPreferredDriver(fakeDevice('d', odd)), null);
  });
  it('safe-auto-migrate honours the string preference (was compared via .driverId)', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../lib/utils/safe-auto-migrate.js'), 'utf8');
    assert.ok(!/userPref && userPref\.driverId ===/.test(src));
  });
});
