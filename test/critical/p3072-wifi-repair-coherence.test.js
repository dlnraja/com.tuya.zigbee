'use strict';
// P3072: Wi-Fi local repair/settings coherence.
//  - one IP across `ip` / `device_ip` / `ip_address` (Repair wrote ip_address, the runtime prefers ip)
//  - TuyaLocalDevice/EweLinkLocalDevice reconnect with the NEW values from onSettings
//  - wifi_ir_remote keeps the Tuya credential repair; every wifi_sonoff_* driver can save its repair view
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const L = require('../../lib/tuya-local/LocalIpSettings');
const { registerEweLinkRepairHandlers, buildEweLinkRepairPatch } = require('../../lib/ewelink-local/eweLinkRepair');

describe('P3072 LocalIpSettings', () => {
  it('effectiveIp keeps the historical precedence', () => {
    assert.strictEqual(L.effectiveIp({ ip: 'a', device_ip: 'b', ip_address: 'c' }), 'a');
    assert.strictEqual(L.effectiveIp({ ip: '', ip_address: 'c' }), 'c');
    assert.strictEqual(L.effectiveIp({}), '');
  });
  it('mirrorIpPatch writes the new IP into every key the device has', () => {
    const out = L.mirrorIpPatch({ ip: '10.0.0.1', local_key: 'k' }, { ip_address: ' 10.0.0.9 ', local_key: 'n' });
    assert.deepStrictEqual(out, { ip_address: '10.0.0.9', ip: '10.0.0.9', local_key: 'n' });
    assert.strictEqual(L.effectiveIp({ ip: '10.0.0.1', ...out }), '10.0.0.9');
  });
  it('mirrorIpPatch leaves non-IP patches untouched', () => {
    const p = { local_key: 'x' };
    assert.strictEqual(L.mirrorIpPatch({ ip: '1' }, p), p);
    assert.strictEqual(L.mirrorIpPatch({ ip: '1' }, null), null);
  });
  it('healIpSettings aligns without changing the effective IP', () => {
    assert.deepStrictEqual(L.healIpSettings({ ip: '', ip_address: '10.0.0.5' }), { ip: '10.0.0.5' });
    assert.deepStrictEqual(L.healIpSettings({ ip: '10.0.0.1', ip_address: '10.0.0.5' }), { ip_address: '10.0.0.1' });
    assert.strictEqual(L.healIpSettings({ ip: '10.0.0.1' }), null);
    assert.strictEqual(L.healIpSettings({}), null);
  });
});

function loadTuyaLocalDeviceWithFake() {
  const writes = [];
  class FakeDevice {
    constructor(settings) { this._s = { ...settings }; this.logs = []; }
    getSettings() { return { ...this._s }; }
    async setSettings(p) { writes.push(p); Object.assign(this._s, p); }
    log(...a) { this.logs.push(a.join(' ')); }
    error() {}
  }
  const original = Module._load;
  const target = require.resolve('../../lib/tuya-local/TuyaLocalDevice');
  const saved = require.cache[target];
  Module._load = function patched(request, parent, isMain) {
    if (request === 'homey') {return { Device: FakeDevice, Driver: class {}, App: class {} };}
    return original.call(this, request, parent, isMain);
  };
  try {
    delete require.cache[target];
    return { Cls: require(target), writes };
  } finally {
    Module._load = original;
    if (saved) {require.cache[target] = saved;} else {delete require.cache[target];}
  }
}

describe('P3072 TuyaLocalDevice IP writes', () => {
  it('setSettings mirrors an ip_address write into ip', async () => {
    const { Cls, writes } = loadTuyaLocalDeviceWithFake();
    const d = Object.create(Cls.prototype);
    d._s = { ip: '192.168.1.10', local_key: 'k' }; d.logs = [];
    await d.setSettings({ ip_address: '192.168.1.20' });
    assert.deepStrictEqual(writes.pop(), { ip_address: '192.168.1.20', ip: '192.168.1.20' });
    assert.strictEqual(L.effectiveIp(d.getSettings()), '192.168.1.20');
  });
  it('boot heal aligns stale keys once', async () => {
    const { Cls, writes } = loadTuyaLocalDeviceWithFake();
    const d = Object.create(Cls.prototype);
    d._s = { ip: '', ip_address: '192.168.1.30' }; d.logs = [];
    await d._healIpSettingsOnce();
    assert.deepStrictEqual(writes.pop(), { ip: '192.168.1.30' });
  });
  it('onSettings recreates the client from the new values', () => {
    const src = read('lib/tuya-local/TuyaLocalDevice.js');
    assert.ok(/async _createDevice\(pendingSettings\)/.test(src));
    assert.ok(src.includes('await this._createDevice(this._pendingIpMirror(changedKeys, newSettings))'));
    const { Cls } = loadTuyaLocalDeviceWithFake();
    const d = Object.create(Cls.prototype);
    d._destroyed = true; // no deferred write in the test
    const ns = d._pendingIpMirror(['ip'], { ip: '10.1.1.1', ip_address: '10.1.1.9', local_key: 'k' });
    assert.strictEqual(ns.ip, '10.1.1.1'); assert.strictEqual(ns.ip_address, '10.1.1.1');
    assert.deepStrictEqual(d._pendingIpMirror(['local_key'], { local_key: 'z' }), { local_key: 'z' });
  });
});

describe('P3072 Wi-Fi repair handlers', () => {
  it('wifi_ir_remote keeps the Tuya credential handlers', () => {
    const src = read('drivers/wifi_ir_remote/driver.js');
    assert.ok(src.includes('await super.onRepair(session, device)'));
    const view = read('drivers/wifi_ir_remote/repair/configure.html');
    assert.ok(/emit\(\s*['"]configure['"]/.test(view));
  });
  it('every wifi_sonoff_* driver registers a repair handler', () => {
    const missing = [];
    for (const d of fs.readdirSync(path.join(ROOT, 'drivers')).filter((x) => x.startsWith('wifi_sonoff_'))) {
      const src = read(`drivers/${d}/driver.js`);
      if (!src.includes('registerEweLinkRepairHandlers(') && !src.includes('EweLinkLocalDriver')) {missing.push(d);}
    }
    assert.deepStrictEqual(missing, []);
  });
  it('eWeLink repair saves trimmed values and reconnects with them', async () => {
    assert.deepStrictEqual(buildEweLinkRepairPatch({ ip: ' 10.0.0.2 ', api_key: '', encrypt: false }), { ip: '10.0.0.2', encrypt: false });
    const handlers = {}; const calls = [];
    const session = { setHandler: (n, fn) => { handlers[n] = fn; } };
    const device = {
      setSettings: async (s) => calls.push(['set', s]),
      reconnectWithSettings: async (s) => calls.push(['reconnect', s]),
    };
    registerEweLinkRepairHandlers(session, device);
    const r = await handlers.configure({ ip: '10.0.0.3', api_key: 'abc' });
    assert.strictEqual(r.success, true);
    assert.deepStrictEqual(calls, [['set', { ip: '10.0.0.3', api_key: 'abc' }], ['reconnect', { ip: '10.0.0.3', api_key: 'abc' }]]);
    assert.deepStrictEqual(await handlers.configure({}), { success: true, changed: false });
  });
  it('EweLinkLocalDevice onSettings reconnects with newSettings', () => {
    const src = read('lib/ewelink-local/EweLinkLocalDevice.js');
    assert.ok(src.includes('await this.reconnectWithSettings(newSettings)'));
    assert.ok(src.includes('...(this._pendingSettings||{})'));
  });
});
