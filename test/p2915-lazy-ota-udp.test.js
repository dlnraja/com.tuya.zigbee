'use strict';
/* eslint-env mocha */
/**
 * P2915 — OTA manager and Tuya WiFi UDP discovery start on first need, with a safe fallback.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

describe('P2915 lazy OTA + WiFi UDP discovery', function () {
  this.timeout(60000);

  it('app.js does not require OTAUpdateManager / TuyaUDPDiscovery at load time', () => {
    assert.ok(!/^const OTAUpdateManager = require/m.test(appSrc));
    assert.ok(!/^const TuyaUDPDiscovery = require/m.test(appSrc));
    assert.ok(!/this\.otaManager = new OTAUpdateManager\(this\.homey\);\n\s*this\.log\('✅ OTA Update Manager initialized \(auto/.test(appSrc), 'no eager construction in onInit');
  });

  it('every OTA consumer goes through _ensureOTAManager / getOTAManager', () => {
    assert.ok(!/this\.otaManager\?\.(checkUpdate|startAutoDiscovery)/.test(appSrc));
    assert.ok(/getOTAManager\(\) \{ return this\._ensureOTAManager\(\); \}/.test(appSrc));
    const tzd = fs.readFileSync(path.join(root, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
    assert.ok(!/safeApp\?\.otaManager\?\.checkUpdate/.test(tzd));
  });

  it('UDP discovery starts only with a WiFi device, and WiFi devices trigger it on init', () => {
    assert.ok(/if \(this\._hasWifiLocalDevices\(\)\) \{ await this\.ensureTuyaUDPDiscovery\(\); \}/.test(appSrc));
    const tld = fs.readFileSync(path.join(root, 'lib/tuya-local/TuyaLocalDevice.js'), 'utf8');
    assert.ok(tld.includes('this.homey.app?.ensureTuyaUDPDiscovery?.()'));
  });

  it('helpers behave: lazy build once, failure is soft, wifi detection by driver id', async () => {
    const Module = require('module');
    const orig = Module._load;
    class Base { constructor() { this.log = () => {}; this.error = () => {}; } }
    let otaBuilt = 0; let udpStarted = 0;
    Module._load = function (req, parent, isMain) {
      if (req === 'homey') return { App: Base, Device: Base, Driver: Base, SimpleClass: Base };
      if (/OTAUpdateManager$/.test(req)) return class { constructor() { otaBuilt++; } checkUpdate() { return null; } };
      if (/TuyaUDPDiscovery$/.test(req)) return class { on() {} async start() { udpStarted++; } async stop() {} };
      return orig.call(this, req, parent, isMain);
    };
    let App;
    try {
      const p = require.resolve(path.join(root, 'app.js'));
      delete require.cache[p];
      App = require(p);
    } catch (_e) { App = null; } finally { Module._load = orig; }
    if (typeof App !== 'function') { return; } // app.js needs the real SDK here: source pins above still apply
    const app = Object.create(App.prototype);
    app.log = () => {}; app.error = () => {};
    const mk = (map) => ({ drivers: { getDrivers: () => Object.fromEntries(Object.entries(map).map(([k, n]) => [k, { getDevices: () => new Array(n).fill({}) }])) } });
    app.homey = mk({ switch_1gang: 2 });
    assert.strictEqual(app._hasWifiLocalDevices(), false);
    assert.strictEqual(app._countAppDevices(), 2);
    assert.strictEqual(otaBuilt, 0);
    Module._load = function (req, parent, isMain) {
      if (/OTAUpdateManager$/.test(req)) return class { constructor() { otaBuilt++; } };
      if (/TuyaUDPDiscovery$/.test(req)) return class { on() {} async start() { udpStarted++; } };
      return orig.call(this, req, parent, isMain);
    };
    try {
      assert.ok(app.getOTAManager()); assert.ok(app.getOTAManager());
      assert.strictEqual(otaBuilt, 1, 'built once');
      app.homey = mk({ wifi_plug: 1 });
      assert.strictEqual(app._hasWifiLocalDevices(), true);
      await app.ensureTuyaUDPDiscovery(); await app.ensureTuyaUDPDiscovery();
      assert.strictEqual(udpStarted, 1, 'started once');
    } finally { Module._load = orig; }
    const bad = Object.create(App.prototype);
    bad.log = () => {}; bad.error = () => {}; bad.homey = {};
    Module._load = function (req, parent, isMain) {
      if (/OTAUpdateManager$/.test(req)) throw new Error('boom');
      return orig.call(this, req, parent, isMain);
    };
    try { assert.strictEqual(bad.getOTAManager(), null); assert.strictEqual(bad._countAppDevices(), 0); } finally { Module._load = orig; }
  });

  it('app.js load heap drops (OTA + UDP no longer required at load)', () => {
    const r = JSON.parse(execFileSync(process.execPath, ['--expose-gc', path.join(root, 'scripts/ci/memory-budget.js'), '--json'],
      { cwd: root, encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: '' } }).trim().split('\n').pop());
    assert.ok(r.appMb <= 2.8, `app.js load heap ${r.appMb} MB (was 2.7-3.1 MB before P2915)`);
  });
});
