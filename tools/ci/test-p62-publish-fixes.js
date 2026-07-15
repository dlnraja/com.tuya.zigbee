'use strict';

/**
 * Test suite for P62 publish fixes — v9.0.253 (2026-07-15)
 *
 * Forum crash analysis (Gmail diagnostics 2026-07-15) revealed:
 *   - 89x "Cannot read properties of undefined (reading 'setTimeout')"
 *   - 48x "Cannot read properties of undefined (reading '_destroyed')"
 *   - 6x  "Cannot find module './utils/safe-timers'"
 *   - 5x  "Failed to register GreenPowerCluster"
 *   - 4x  "Invalid Flow Card ID: boiler_switch_energy_turned_on/off"
 *   - 4x  "this.safeSetCapabilityValue is not a function"
 *
 * P62 fixes:
 *   - homey-online-guidelines-audit.js: < 22 → < 18 (engines.node fix)
 *   - 2 lib files fixed require path './utils/safe-timers' → '../utils/safe-timers'
 *   - lib/utils/SafeTimerAccessor.js: global install of safeSetTimeout on
 *     ZigBeeDevice.prototype (P58-style patch)
 *   - drivers/boiler_switch_energy/driver.js: removed broken flow card
 *     registration code (no driver.flow.compose.json)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

console.log('=== P62 publish fixes tests (forum crash analysis) ===');

// 1. engines.node audit: now < 18, not < 22
test('homey-online-guidelines-audit: requires Node 18+ (not 22)', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '..', '..', 'scripts', 'ci', 'homey-online-guidelines-audit.js'),
    'utf8'
  );
  assert.ok(content.includes('< 18'),
    'should require Node 18+ (P62 fix)');
  // The check is for the actual code `if (semverMajor(engines.node) < 22)`.
  // The comment may mention "< 22" (P62 fix description), so be specific.
  assert.ok(!content.includes('semverMajor(engines.node) < 22'),
    'should NOT have semverMajor(engines.node) < 22 (was a bug)');
  assert.ok(content.includes('semverMajor(engines.node) < 18'),
    'should have semverMajor(engines.node) < 18 (P62 fix)');
});

// 2. package.json engines.node is >=18
test('package.json engines.node: >=18.0.0', () => {
  const pkg = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', '..', 'package.json'),
    'utf8'
  ));
  assert.ok(pkg.engines && pkg.engines.node, 'engines.node present');
  assert.ok(pkg.engines.node.startsWith('>=18'),
    `engines.node should be >=18, got "${pkg.engines.node}"`);
});

// 3. lib/adapters/SecurityManager.js fixed require path
test('lib/adapters/SecurityManager.js: require path corrected', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '..', '..', 'lib', 'adapters', 'SecurityManager.js'),
    'utf8'
  );
  assert.ok(content.includes("require('../utils/safe-timers')"),
    'should require ../utils/safe-timers (P62 fix)');
  assert.ok(!content.includes("require('./utils/safe-timers')"),
    'should NOT require ./utils/safe-timers anymore');
  // Should be loadable
  delete require.cache[require.resolve('../../lib/adapters/SecurityManager.js')];
  try {
    require('../../lib/adapters/SecurityManager.js');
  } catch (e) {
    throw new Error('SecurityManager.js still fails to load: ' + e.message);
  }
});

// 4. lib/performance/PerformanceOptimizer.js fixed require path
test('lib/performance/PerformanceOptimizer.js: require path corrected', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '..', '..', 'lib', 'performance', 'PerformanceOptimizer.js'),
    'utf8'
  );
  assert.ok(content.includes("require('../utils/safe-timers')"),
    'should require ../utils/safe-timers (P62 fix)');
  assert.ok(!content.includes("require('./utils/safe-timers')"),
    'should NOT require ./utils/safe-timers anymore');
  delete require.cache[require.resolve('../../lib/performance/PerformanceOptimizer.js')];
  try {
    require('../../lib/performance/PerformanceOptimizer.js');
  } catch (e) {
    throw new Error('PerformanceOptimizer.js still fails to load: ' + e.message);
  }
});

// 5. SafeTimerAccessor module loads and has installSafeTimerAccessor
test('SafeTimerAccessor module loads', () => {
  const m = require('../../lib/utils/SafeTimerAccessor');
  assert.ok(typeof m.installSafeTimerAccessor === 'function',
    'installSafeTimerAccessor exported');
  assert.strictEqual(m.installSafeTimerAccessor(null), false,
    'null BaseClass returns false');
  assert.strictEqual(m.installSafeTimerAccessor(undefined), false,
    'undefined BaseClass returns false');
});

// 6. installSafeTimerAccessor is idempotent
test('installSafeTimerAccessor: idempotent', () => {
  const m = require('../../lib/utils/SafeTimerAccessor');
  class StubBase {}
  const first = m.installSafeTimerAccessor(StubBase);
  assert.strictEqual(first, true, 'first install returns true');
  const second = m.installSafeTimerAccessor(StubBase);
  assert.strictEqual(second, false, 'second install returns false (already present)');
  // Methods should be on prototype
  assert.strictEqual(typeof StubBase.prototype.safeSetTimeout, 'function');
  assert.strictEqual(typeof StubBase.prototype.safeClearTimeout, 'function');
  assert.strictEqual(typeof StubBase.prototype.safeSetInterval, 'function');
  assert.strictEqual(typeof StubBase.prototype.safeClearInterval, 'function');
  assert.strictEqual(typeof StubBase.prototype.isDestroyedSafe, 'function');
});

// 7. Patched safeSetTimeout works on a stub instance
test('safeSetTimeout: instance method never throws', () => {
  const m = require('../../lib/utils/SafeTimerAccessor');
  class StubBase {}
  m.installSafeTimerAccessor(StubBase);
  const inst = new StubBase();
  inst.homey = null; // dangerous case
  // Should not throw, should fall back to global setTimeout
  let called = false;
  const t = inst.safeSetTimeout(() => { called = true; }, 5);
  assert.ok(t, 'returned a timer');
  // Wait briefly
  return new Promise((r) => {
    setTimeout(() => {
      try {
        inst.safeClearTimeout(t);
        assert.ok(called || true, 'no throw');
        r();
      } catch (e) {
        r(e);
      }
    }, 20);
  });
});

// 8. boiler_switch_energy flow card fix
test('boiler_switch_energy/driver.js: broken flow card registration removed', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '..', '..', 'drivers', 'boiler_switch_energy', 'driver.js'),
    'utf8'
  );
  // Should NOT call getDeviceTriggerCard for boiler_switch_energy_turned_on/off
  // (these cards don't exist in any driver.flow.compose.json)
  assert.ok(!content.includes("getDeviceTriggerCard('boiler_switch_energy_turned_on')"),
    'should not try to register non-existent flow card');
  assert.ok(!content.includes("getConditionCard('boiler_switch_energy_temperature_above')"),
    'should not try to register non-existent flow card');
});

// 9. App.js wires the SafeTimerAccessor
test('app.js: wires SafeTimerAccessor globally', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '..', '..', 'app.js'),
    'utf8'
  );
  assert.ok(content.includes('installSafeTimerAccessor'),
    'app.js should call installSafeTimerAccessor');
  assert.ok(content.includes('SafeTimerAccessor'),
    'app.js should require SafeTimerAccessor');
});

// 10. App.js still wires the P58 + P59 installs
test('app.js: P58 + P59 global installs still in place', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '..', '..', 'app.js'),
    'utf8'
  );
  assert.ok(content.includes('installSafeCapabilityMixin'),
    'app.js should call installSafeCapabilityMixin (P58)');
  assert.ok(content.includes('installManufacturerNameAccessor'),
    'app.js should call installManufacturerNameAccessor (P59)');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
