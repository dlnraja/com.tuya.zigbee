'use strict';
// P2931: lazy module handles keep behaviour (new, static, call, instanceof, optional) and load on first use.
const test = require('node:test');
const assert = require('node:assert');
const { lazy } = require('../../lib/utils/lazyRequire');

test('loads on first use and forwards new / statics / call / instanceof', () => {
  let loads = 0;
  class Real { constructor(x) { this.x = x; } static make(x) { return new this(x); } }
  Real.TABLE = { a: 1 };
  const L = lazy(() => { loads++; return Real; });
  assert.strictEqual(loads, 0);
  const o = new L(3);
  assert.strictEqual(loads, 1); assert.strictEqual(o.x, 3);
  assert.ok(o instanceof L); assert.ok(o instanceof Real);
  assert.strictEqual(L.TABLE.a, 1); assert.strictEqual(L.make(4).x, 4);
  const fn = lazy(() => (a, b) => a + b);
  assert.strictEqual(fn(2, 3), 5);
  const obj = lazy(() => ({ k: 1, f() { return this.k; } }));
  assert.strictEqual(obj.f(), 1); assert.ok('k' in obj); assert.ok(Object.keys(obj).includes('k'));
  assert.strictEqual(loads, 1);
});

test('optional handle is null when the file is missing, like the old try/require', () => {
  assert.strictEqual(lazy(() => require('./nope'), { optional: true, resolve: () => require.resolve('./does-not-exist') }), null);
});

test('situational modules are not loaded by the shared base classes at startup', () => {
  // fresh process: other suites in this run may already have loaded these modules
  const { execFileSync } = require('child_process');
  const path = require('path');
  const out = execFileSync(process.execPath, ['-e', "const r=require('./scripts/ci/memory-budget.js').measure();console.log(JSON.stringify({e:r.loadErrors,m:Object.keys(require.cache)}))"], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const { e, m: loaded } = JSON.parse(out.trim().split('\n').pop());
  assert.strictEqual(e, 0);
  for (const m of ['lib/tuya-local/TuyaSmartLifeAuth.js', 'drivers/presence_sensor_radar/configs.js', 'lib/managers/SmartDriverAdaptation.js', 'lib/tuya/DataRecoveryManager.js', 'lib/helpers/BatteryRouter.js']) {
    assert.ok(!loaded.some((f) => f.endsWith(m)), `${m} loaded eagerly`);
  }
});
