'use strict';
// P3072: the eleven wifi_sonoff_* drivers extended ZigBeeDriver or Homey.Driver directly, so the
// pair view's 'configure' / 'list_devices' calls had no handler (pairing could not finish).
// They now extend EweLinkLocalDriver (LAN pair + repair + mDNS hooks) and keep their own flow cards.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.resolve(__dirname, '../..');

async function withFakeHomey(fn) {
  class Driver { log() {} error() {} }
  const original = Module._load;
  const touched = [];
  Module._load = function patched(request, parent, isMain) {
    if (request === 'homey') {return { Driver, Device: class {}, App: class {} };}
    return original.call(this, request, parent, isMain);
  };
  try { return await fn(touched); } finally {
    Module._load = original;
    for (const k of Object.keys(require.cache)) {
      if (k.includes(`${path.sep}drivers${path.sep}wifi_sonoff_`) || k.includes(`${path.sep}lib${path.sep}ewelink-local${path.sep}`)) {delete require.cache[k];}
    }
  }
}

const card = () => ({ registerRunListener() { return this; }, registerArgumentAutocompleteListener() { return this; }, trigger: async () => {} });
const fakeHomey = { flow: { getActionCard: card, getConditionCard: card, getDeviceTriggerCard: card, getTriggerCard: card } };

describe('P3072 wifi_sonoff_* LAN pairing', () => {
  const names = fs.readdirSync(path.join(ROOT, 'drivers')).filter((x) => x.startsWith('wifi_sonoff_')).sort();
  it('covers all sonoff Wi-Fi drivers', () => { assert.ok(names.length >= 11, String(names.length)); });
  it('each driver is an EweLinkLocalDriver with pair handlers and still inits its flow cards', async () => {
    await withFakeHomey(async () => {
      const for_ = [];
      for (const n of names) {
        for (const k of Object.keys(require.cache)) {if (k.includes('ewelink-local')) {delete require.cache[k];}}
        const E = require(path.join(ROOT, 'lib/ewelink-local/EweLinkLocalDriver'));
        const D = require(path.join(ROOT, 'drivers', n, 'driver.js'));
        assert.ok(D.prototype instanceof E, `${n} must extend EweLinkLocalDriver`);
        const d = new D();
        d.homey = fakeHomey;
        await d.onInit();
        const handlers = {};
        await d.onPair({ setHandler: (h, f) => { handlers[h] = f; } });
        assert.strictEqual(typeof handlers.configure, 'function', n);
        assert.strictEqual(typeof handlers.list_devices, 'function', n);
        await handlers.configure({ device_id: '1000abcdef', ip: '192.168.1.7' });
        d.getDiscoveryStrategy = () => ({ getDiscoveryResults: () => ({}) });
        const list = await handlers.list_devices();
        assert.strictEqual(list[0].data.id, '1000abcdef', n);
        assert.strictEqual(list[0].settings.ip, '192.168.1.7', n);
        // repair must register its handlers without a ReferenceError (dualr3 regression)
        const rh = {};
        await d.onRepair({ setHandler: (h, f) => { rh[h] = f; } }, { getSettings: () => ({}), getData: () => ({ id: 'x' }) });
        assert.ok(Object.keys(rh).length > 0, `${n} repair handlers`);
        for_.push(n);
      }
      assert.strictEqual(for_.length, names.length);
    });
  });
  it('no wifi_sonoff_* driver extends ZigBeeDriver any more', () => {
    for (const n of names) {
      const src = fs.readFileSync(path.join(ROOT, 'drivers', n, 'driver.js'), 'utf8');
      assert.ok(!/extends\s+ZigBeeDriver/.test(src), n);
    }
  });
});
