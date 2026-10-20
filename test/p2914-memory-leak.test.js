'use strict';
/* eslint-env mocha */
/**
 * P2914 — memory leak + budget guards (Homey app heap limit ~64 MB; Bastien 1.0.161 crashed with
 * "Reached heap limit Allocation failed - JavaScript heap out of memory" on 18/10/2026).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const heap = () => { if (global.gc) { global.gc(); } return process.memoryUsage().heapUsed; };

function fakeDevice(i) {
  const big = new Array(2000).fill(i); // makes a retained device visible in heap numbers
  return {
    big,
    log() {}, error() {},
    getData: () => ({ id: `dev-${i}` }), getName: () => `dev-${i}`,
    getSetting: () => null, getStoreValue: () => null, setStoreValue: async () => {},
    getAvailable: () => true, setAvailable: async () => {}, setUnavailable: async () => {},
    hasCapability: () => false, getCapabilities: () => [],
    homey: { setTimeout, clearTimeout, setInterval, clearInterval },
  };
}

describe('P2914 memory: add/remove devices N times keeps registries and heap bounded', function () {
  this.timeout(120000);

  it('ZigbeeResilience attach/detach x3000 (incl. double node-init) leaves the shared registry empty', () => {
    const zbr = require('../lib/reliability/ZigbeeResilience');
    const before = heap();
    for (let i = 0; i < 3000; i++) {
      const dev = fakeDevice(i);
      // first init
      dev._zbResilience = zbr.attach(dev);
      // re-init path as now coded in BaseUnifiedDevice: detach the old entry before attaching again
      if (dev._zbResilience) {zbr.detach(dev._zbResilience);}
      dev._zbResilience = zbr.attach(dev);
      // onDeleted / onUninit
      zbr.detach(dev._zbResilience);
      dev._zbResilience = null;
    }
    assert.strictEqual(zbr._registry.size, 0, 'registry must be empty after all devices are removed');
    const grownMb = (heap() - before) / 1048576;
    assert.ok(grownMb < 8, `heap grew ${grownMb.toFixed(1)} MB over 3000 add/remove cycles`);
  });

  it('DPCache get/remove x3000 keeps the per-device map bounded', () => {
    const { getDeviceCache, removeDeviceCache } = require('../lib/managers/DPCache');
    const before = heap();
    for (let i = 0; i < 3000; i++) {
      const c = getDeviceCache(`dpc-${i}`);
      for (let dp = 1; dp < 20; dp++) {c.set(dp, new Array(50).fill(dp));}
      removeDeviceCache(`dpc-${i}`);
    }
    const grownMb = (heap() - before) / 1048576;
    assert.ok(grownMb < 8, `heap grew ${grownMb.toFixed(1)} MB`);
  });

  it('device bases release the resilience entry on re-init, onUninit and onDeleted', () => {
    const bud = read('lib/devices/BaseUnifiedDevice.js');
    assert.ok(/if \(this\._zbResilience\) \{ zbr\.detach\(this\._zbResilience\); \}\s*\n\s*this\._zbResilience = zbr\.attach\(this\);/.test(bud),
      'BaseUnifiedDevice must detach the previous entry before attach');
    const tzd = read('lib/tuya/TuyaZigbeeDevice.js');
    const un = tzd.slice(tzd.indexOf('  async onUninit() {'), tzd.indexOf('  async onUninit() {') + 1500);
    assert.ok(un.includes("require('../reliability/ZigbeeResilience').detach(this._zbResilience)"), 'onUninit must detach');
  });

  it('NetworkResilience does not load http/https at require time (lazy, P2914)', () => {
    const s = read('lib/utils/NetworkResilience.js');
    assert.ok(!/^const https? = require\('https?'\);/m.test(s), 'http/https must be lazy');
    assert.ok(!/^const \{ createNetworkBreaker \} = require/m.test(read('lib/tuya/TuyaZigbeeDevice.js')),
      'TuyaZigbeeDevice must load NetworkResilience on first use');
  });

  it('code heap of app.js + all drivers stays inside the memory budget', () => {
    const budget = require('../scripts/ci/memory-budget.json').codeHeapBudgetMb;
    const out = execFileSync(process.execPath, ['--expose-gc', path.join(root, 'scripts/ci/memory-budget.js'), '--json'],
      { cwd: root, encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: '' } });
    const r = JSON.parse(out.trim().split('\n').pop());
    assert.ok(r.drivers > 100, 'probe must load the drivers');
    assert.ok(r.loadErrors <= 40, `too many driver load errors (${r.loadErrors}) — numbers would be meaningless: ${r.loadErrorSample.join('; ')}`);
    assert.ok(r.totalMb <= budget, `code heap ${r.totalMb} MB > budget ${budget} MB (scripts/ci/memory-budget.json)`);
  });
});
