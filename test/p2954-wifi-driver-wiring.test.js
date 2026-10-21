'use strict';
/* eslint-env mocha */
const assert = require('assert');
const Module = require('module');
const W = require('../lib/tuya-local/WifiDriverWiring');
const { COVER_COMMAND_SETS } = require('../lib/tuya-local/TuyaDeviceTemplates');

describe('P2954 Wi-Fi driver wiring', () => {
  const origLoad = Module._load;
  before(() => {
    Module._load = function (r, ...a) {
      if (r === 'homey') { class B {} return { Device: B, Driver: B, App: B, SimpleClass: B, __: (k) => k }; }
      return origLoad.call(this, r, ...a);
    };
  });
  after(() => { Module._load = origLoad; });

  it('sub-socket caps only for plug-like drivers, never DP1', () => {
    const caps = W.subSocketCapabilities('wifi_plug', 'd', { 1: true, 2: false, 3: true, 7: true });
    assert.deepStrictEqual(caps.map((c) => c.capability), ['onoff.socket2', 'onoff.socket3', 'onoff.usb']);
    assert.deepStrictEqual(W.subSocketCapabilities('wifi_power_strip', 'd', { 1: true, 2: true }), []);
    assert.deepStrictEqual(W.subSocketCapabilities('wifi_plug', 'd', { 1: true }), []);
  });

  it('ack tracker reports once after 3 unanswered writes', () => {
    const t = new W.CommandAckTracker();
    t.sentDp(1); t.sentDp(1); t.received({ 1: true });
    assert.strictEqual(t.check(), null);
    const u = new W.CommandAckTracker();
    u.sentDp(1); u.sentDp(1); u.sentDp(1);
    assert.ok(u.check({ cid: 'c' }).reasons.includes('sub_device_needs_gateway_cid'));
    assert.strictEqual(u.check({ cid: 'c' }), null);
  });

  it('cover command set from cloud range', () => {
    assert.deepStrictEqual(W.coverCommandSetFromRange(['open', 'stop', 'close', 'continue'], COVER_COMMAND_SETS), { name: 'open_close_stop', status: 'confirmed' });
    assert.strictEqual(W.coverCommandSetFromRange(['ZZ', 'FZ', 'STOP'], COVER_COMMAND_SETS).name, 'zz_fz_stop');
    assert.strictEqual(W.coverCommandSetFromRange(['x'], COVER_COMMAND_SETS), null);
    assert.strictEqual(W.coverCommandSetFromRange(null, COVER_COMMAND_SETS), null);
  });

  it('device exposes sub-sockets additively and respects opt-out', async () => {
    const proto = require('../lib/tuya-local/TuyaLocalDevice').prototype;
    const added = []; const listeners = [];
    const fake = { driver: { id: 'wifi_plug' }, getData: () => ({ id: 'd' }), _client: { lastDps: {} }, log() {},
      getStoreValue: () => undefined, hasCapability: () => false, addCapability: async (c) => added.push(c),
      registerCapabilityListener: (c) => listeners.push(c) };
    proto._maybeExposeSubSockets.call(fake, { 1: true, 2: true });
    await new Promise((r) => setImmediate(r));
    assert.deepStrictEqual(added, ['onoff.socket2']);
    assert.deepStrictEqual(listeners, ['onoff.socket2']);
    assert.strictEqual(fake._extraCapMap[0].dp, 2);
    const off = { ...fake, _subSocketsDone: false, _extraCapMap: undefined, getStoreValue: () => true };
    proto._maybeExposeSubSockets.call(off, { 1: true, 2: true });
    assert.strictEqual(off._extraCapMap, undefined);
  });

  it('device ack diagnosis is stored once', () => {
    const proto = require('../lib/tuya-local/TuyaLocalDevice').prototype;
    const store = {};
    const fake = { log() {}, getData: () => ({ id: 'd' }), getStore: () => ({ cid: 'c1' }), setStoreValue: async (k, v) => { store[k] = v; } };
    for (let i = 0; i < 3; i++) {proto._noteSent.call(fake, 1);}
    proto._trackAcks.call(fake, { 9: 1 });
    assert.ok(store.ignored_commands_diag.reasons.includes('sub_device_needs_gateway_cid'));
  });
});
