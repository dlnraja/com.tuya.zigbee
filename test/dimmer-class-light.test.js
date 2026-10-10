'use strict';
// Dimmer drivers use class "light" (user decision 2026-10-04) and migrate paired devices once.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRIVERS = ['dimmer_2_gang_tuya', 'dimmer_wall_switch', 'wall_dimmer_1gang_1way'];

function fakeDevice(cls, store = {}) {
  const d = {
    cls, store, calls: 0,
    getClass() { return this.cls; },
    async setClass(c) { this.calls++; this.cls = c; },
    getStoreValue(k) { return this.store[k]; },
    async setStoreValue(k, v) { this.store[k] = v; },
    log() {}, error() {},
  };
  return d;
}

describe('dimmer class -> light', () => {
  it('manifests declare class light and keep dim', () => {
    for (const id of DRIVERS) {
      const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
      assert.strictEqual(j.class, 'light', id);
      assert.ok(j.capabilities.includes('dim'), `${id} keeps dim`);
    }
  });

  it('device.js calls the one-shot migration', () => {
    for (const id of DRIVERS) {
      const src = fs.readFileSync(path.join(ROOT, 'drivers', id, 'device.js'), 'utf8');
      assert.ok(/migrateDeviceClass\(this, 'light'/.test(src), id);
    }
  });

  it('migrates socket once, leaves foreign classes alone, never throws', async () => {
    const { migrateDeviceClass } = require('../lib/utils/DeviceClassMigration');
    const a = fakeDevice('socket');
    assert.strictEqual(await migrateDeviceClass(a, 'light'), true);
    assert.strictEqual(a.cls, 'light');
    a.cls = 'socket';
    assert.strictEqual(await migrateDeviceClass(a, 'light'), false, 'flag makes it one-shot');
    assert.strictEqual(a.cls, 'socket');
    const b = fakeDevice('fan');
    assert.strictEqual(await migrateDeviceClass(b, 'light'), false);
    assert.strictEqual(b.cls, 'fan');
    const c = fakeDevice('socket');
    c.setClass = async () => { throw new Error('boom'); };
    assert.strictEqual(await migrateDeviceClass(c, 'light'), false);
    assert.strictEqual(await migrateDeviceClass(null, 'light'), false);
  });
});
