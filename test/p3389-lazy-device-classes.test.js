'use strict';
// P3389 (t1023u, p3272 Bastien OOM): device.js bodies run on first use, so ~440 drivers without a
// paired device no longer cost class bodies + their libs at boot. Fail-before: no lazy helper, the
// ratchet finds eager device.js files and the 66 MB boot child sees no heap difference.
require('./_support/homey-stub');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const HELPER = path.join(ROOT, 'lib', 'utils', 'LazyDeviceClass.js');
const MARK = '// P3389 lazy device class';
const BARE_REEXPORT = /^module\.exports\s*=\s*require\(\s*['"][^'"]+['"]\s*\)\s*;\s*$/m;

function driverIds() {
  return fs.readdirSync(path.join(ROOT, 'drivers')).filter((d) => fs.existsSync(path.join(ROOT, 'drivers', d, 'device.js'))).sort();
}

describe('P3389 lazy device classes', function () {
  this.timeout(60000);

  it('every drivers/*/device.js is lazy or a bare re-export of a lazy one', () => {
    const eager = driverIds().filter((id) => {
      const s = fs.readFileSync(path.join(ROOT, 'drivers', id, 'device.js'), 'utf8');
      return !s.includes(MARK) && !(BARE_REEXPORT.test(s) && (s.match(/module\.exports/g) || []).length === 1);
    });
    assert.deepStrictEqual(eager, [], `eager device.js (run node scripts/maintenance/p3389-lazy-device-entries.js): ${eager.join(', ')}`);
  });

  it('the stand-in behaves like the class: new, extends, instanceof, statics, helper exports', () => {
    assert.ok(fs.existsSync(HELPER), 'lib/utils/LazyDeviceClass.js missing');
    const { lazyDeviceClass, isMaterialized } = require(HELPER);
    class Base { constructor(a) { this.a = a; } hello() { return `hi ${this.a}`; } static kind() { return 'base'; } }
    const mod = { exports: {}, filename: 'fake/device.js' };
    let runs = 0;
    const L = lazyDeviceClass(mod, () => {
      runs += 1;
      class Real extends Base { static tag() { return `real:${this.name}`; } }
      mod.exports = Real;
      mod.exports.helper = (x) => x * 2;
      return mod.exports;
    });
    assert.strictEqual(runs, 0, 'body must not run at require time');
    assert.strictEqual(isMaterialized(L), false);
    assert.strictEqual(mod.exports, L, 'module.exports is the stand-in');
    assert.strictEqual(typeof L, 'function');
    const o = new L(7);
    assert.strictEqual(runs, 1);
    assert.strictEqual(isMaterialized(L), true);
    assert.strictEqual(mod.exports, L, 'require identity stays stable after first use');
    assert.ok(o instanceof L && o instanceof Base);
    assert.strictEqual(o.hello(), 'hi 7');
    assert.strictEqual(L.helper(21), 42);
    assert.strictEqual(L.kind(), 'base');
    assert.strictEqual(L.tag(), 'real:Real');
    assert.strictEqual(L.name, 'Real');
    class Sub extends L { hello() { return `${super.hello()}!`; } }
    const s = new Sub(3);
    assert.strictEqual(s.hello(), 'hi 3!');
    assert.ok(s instanceof Sub && s instanceof L && s instanceof Base);
    assert.strictEqual(Object.getPrototypeOf(s), Sub.prototype);
    assert.strictEqual(Object.getPrototypeOf(L.prototype), Base.prototype);
    assert.ok(Object.getOwnPropertyDescriptor(L, 'prototype'));
    assert.ok(Object.keys(L).includes('helper'));
    assert.throws(() => L(1), TypeError, 'calling a class without new still throws');
    assert.strictEqual(runs, 1, 'body runs once');
  });

  it('a body that touches itself while loading fails loudly instead of returning a half class', () => {
    const { lazyDeviceClass } = require(HELPER);
    const mod = { exports: {}, filename: 'loop/device.js' };
    const L = lazyDeviceClass(mod, () => { void mod.exports.prototype; return class X {}; });
    assert.throws(() => new L(), /still loading/);
  });

  it('a real driver: untouched until used, then a Homey Device with its helper exports', () => {
    const { isMaterialized } = require(HELPER);
    const C = require(path.join(ROOT, 'drivers', 'air_purifier_soil', 'device.js'));
    const C2 = require(path.join(ROOT, 'drivers', 'air_purifier_soil', 'device.js'));
    assert.strictEqual(C, C2);
    const fresh = !isMaterialized(C);
    assert.strictEqual(typeof C.soilTemperature, 'function');
    assert.strictEqual(isMaterialized(C), true);
    // the real soil class: its own prototype methods and a base class chain behind it
    assert.strictEqual(typeof C.prototype.onNodeInit, 'function', 'device class with onNodeInit');
    assert.strictEqual(typeof Object.getPrototypeOf(C), 'function', 'extends a base class');
    assert.strictEqual(typeof fresh, 'boolean');
  });

  it('66 MB Homey heap: booting every driver costs far less than eager loading (house uses 3 drivers)', () => {
    const child = `
      require(${JSON.stringify(path.join(ROOT, 'test', '_support', 'homey-stub.js'))});
      const fs = require('fs'), path = require('path'); const root = ${JSON.stringify(ROOT)};
      try { require('homey-zigbeedriver'); } catch (_e) {}
      const heap = () => { global.gc(); global.gc(); return process.memoryUsage().heapUsed; };
      const h0 = heap();
      for (const id of fs.readdirSync(path.join(root, 'drivers'))) {
        for (const f of ['driver.js', 'device.js']) {
          const p = path.join(root, 'drivers', id, f);
          if (fs.existsSync(p) && fs.existsSync(path.join(root, 'drivers', id, 'driver.compose.json'))) require(p);
        }
      }
      for (const id of ['switch_1gang', 'switch_4gang', 'button_wireless_3']) void require(path.join(root, 'drivers', id, 'device.js')).prototype;
      process.stdout.write(String(heap() - h0));`;
    const run = (eager) => {
      const r = spawnSync(process.execPath, ['--max-old-space-size=66', '--expose-gc', '-e', child], {
        cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { TUYA_EAGER_DEVICE_CLASSES: eager ? '1' : '' }), maxBuffer: 1 << 20,
      });
      assert.strictEqual(r.status, 0, `boot child failed (eager=${eager}): ${String(r.stderr).slice(-800)}`);
      return Number(r.stdout.trim());
    };
    const lazy = run(false);
    const eager = run(true);
    const mb = (b) => (b / 1048576).toFixed(1);
    assert.ok(lazy < eager * 0.8 && eager - lazy > 4 * 1048576, `lazy ${mb(lazy)} MB vs eager ${mb(eager)} MB: expected >= 20% and >= 4 MB less`);
  });
});
