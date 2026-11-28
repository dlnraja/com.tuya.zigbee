'use strict';
// P3424: setUserPreferredDriver had no caller, so the user-choice lock in safe-auto-migrate / driver-switcher never
// engaged. The pairing driver is now recorded on onAdded (never overwriting) and cleared on onDeleted.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const pref = require('../../lib/utils/driver-preference');

function fakeDevice(id, driverId, store) {
  return { getData: () => ({ id }), driver: { id: driverId }, homey: { settings: { get: async (k) => store[k], set: async (k, v) => { store[k] = v; } } } };
}

describe('P3424 driver preference wired to pairing', () => {
  it('records the pairing driver once and keeps an existing choice', async () => {
    const store = {};
    await pref.recordPairedDriver(fakeDevice('a', 'usb_outlet', store));
    assert.strictEqual(await pref.getUserPreferredDriver(fakeDevice('a', 'x', store)), 'usb_outlet');
    await pref.recordPairedDriver(fakeDevice('a', 'switch_1gang', store));
    assert.strictEqual(store[pref.PREF_KEY].a, 'usb_outlet');
  });
  it('is a silent no-op without settings or driver id', async () => {
    await pref.recordPairedDriver({ getData: () => ({ id: 'b' }) });
    await pref.recordPairedDriver(null);
  });
  it('clear removes the entry', async () => {
    const store = {};
    const d = fakeDevice('c', 'siren', store);
    await pref.recordPairedDriver(d);
    await pref.clearUserPreferredDriver(d);
    assert.strictEqual(await pref.getUserPreferredDriver(d), null);
  });
  it('BaseUnifiedDevice calls record on onAdded and clear on onDeleted', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../lib/devices/BaseUnifiedDevice.js'), 'utf8');
    const added = src.slice(src.indexOf('async onAdded()'), src.indexOf('async onAdded()') + 800);
    const deleted = src.slice(src.indexOf('async onDeleted()'), src.indexOf('async onDeleted()') + 800);
    assert.match(added, /recordPairedDriver\(this\)/);
    assert.match(deleted, /clearUserPreferredDriver\(this\)/);
  });
});
