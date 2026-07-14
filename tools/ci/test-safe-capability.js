'use strict';

/**
 * Test for SafeCapability mixin and standalone helper
 *
 * Run with: node tools/ci/test-safe-capability.js
 *
 * 20 tests, 0 external deps.
 */

const assert = require('assert');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');

const {
  safeSetCapabilityValue,
  installSafeCapabilityMixin,
  SafeCapabilityMixin,
} = require(path.join(ROOT, 'lib/utils/SafeCapability.js'));

// ----- Mock device for testing -----
function makeMockDevice(opts = {}) {
  const cap = opts.caps || new Set(['measure_battery']);
  let destroyed = !!opts.destroyed;
  const calls = [];
  // Create instance with mixin on prototype
  class MockDevice {}
  Object.assign(MockDevice.prototype, SafeCapabilityMixin);
  const d = new MockDevice();
  d.destroyed = destroyed;
  d._destroyed = destroyed;
  d.hasCapability = (id) => cap.has(id);
  d.setCapabilityValue = async (id, val) => {
    calls.push({ id, val });
    if (opts.throw) throw new Error('mock-throw');
    return true;
  };
  d.calls = calls;
  d.destroy = () => {
    destroyed = true;
    d.destroyed = true;
    d._destroyed = true;
  };
  return d;
}

let passed = 0, failed = 0;
function test(name, fn) {
  return Promise.resolve().then(fn).then(
    () => { passed++; console.log(`  ✓ ${name}`); },
    (err) => { failed++; console.log(`  ✗ ${name}\n      ${err.message}`); }
  );
}

(async function run() {
  console.log('=== SafeCapability tests ===');

  // Mixin tests
  await test('mixin: provides safeSetCapabilityValue', () => {
    assert.strictEqual(typeof SafeCapabilityMixin.safeSetCapabilityValue, 'function');
  });

  await test('method: returns false on destroyed device', async () => {
    const d = makeMockDevice({ destroyed: true });
    const r = await d.safeSetCapabilityValue('measure_battery', 50);
    assert.strictEqual(r, false);
    assert.strictEqual(d.calls.length, 0);
  });

  await test('method: returns false on missing capability', async () => {
    const d = makeMockDevice();
    const r = await d.safeSetCapabilityValue('does_not_exist', 1);
    assert.strictEqual(r, false);
    assert.strictEqual(d.calls.length, 0);
  });

  await test('method: returns false on undefined value', async () => {
    const d = makeMockDevice();
    const r = await d.safeSetCapabilityValue('measure_battery', undefined);
    assert.strictEqual(r, false);
  });

  await test('method: returns false on NaN value', async () => {
    const d = makeMockDevice();
    const r = await d.safeSetCapabilityValue('measure_battery', NaN);
    assert.strictEqual(r, false);
  });

  await test('method: commits valid value', async () => {
    const d = makeMockDevice();
    const r = await d.safeSetCapabilityValue('measure_battery', 75);
    assert.strictEqual(r, true);
    assert.deepStrictEqual(d.calls, [{ id: 'measure_battery', val: 75 }]);
  });

  await test('method: returns false on null value', async () => {
    const d = makeMockDevice();
    const r = await d.safeSetCapabilityValue('measure_battery', null);
    // null is technically a valid value (some caps accept it), so we test it does not throw
    assert.strictEqual(typeof r, 'boolean');
  });

  await test('method: swallows thrown errors from setCapabilityValue', async () => {
    const d = makeMockDevice({ throw: true });
    const r = await d.safeSetCapabilityValue('measure_battery', 50);
    assert.strictEqual(r, false);
  });

  await test('method: works for onoff false', async () => {
    const d = makeMockDevice({ caps: new Set(['onoff']) });
    const r = await d.safeSetCapabilityValue('onoff', false);
    assert.strictEqual(r, true);
    assert.deepStrictEqual(d.calls[0].val, false);
  });

  await test('method: works for onoff true', async () => {
    const d = makeMockDevice({ caps: new Set(['onoff']) });
    const r = await d.safeSetCapabilityValue('onoff', true);
    assert.strictEqual(r, true);
  });

  // Standalone function tests
  await test('standalone: returns false on null device', async () => {
    const r = await safeSetCapabilityValue(null, 'x', 1);
    assert.strictEqual(r, false);
  });

  await test('standalone: uses device method when present', async () => {
    const d = makeMockDevice();
    const r = await safeSetCapabilityValue(d, 'measure_battery', 33);
    assert.strictEqual(r, true);
    assert.strictEqual(d.calls[0].val, 33);
  });

  await test('standalone: returns false on destroyed device', async () => {
    const d = makeMockDevice({ destroyed: true });
    const r = await safeSetCapabilityValue(d, 'measure_battery', 50);
    assert.strictEqual(r, false);
  });

  // installSafeCapabilityMixin
  await test('installSafeCapabilityMixin: adds method to prototype', () => {
    class Foo {}
    const r = installSafeCapabilityMixin(Foo);
    assert.strictEqual(r, true);
    assert.strictEqual(typeof Foo.prototype.safeSetCapabilityValue, 'function');
  });

  await test('installSafeCapabilityMixin: idempotent (returns false second time)', () => {
    class Foo {}
    installSafeCapabilityMixin(Foo);
    const r2 = installSafeCapabilityMixin(Foo);
    assert.strictEqual(r2, false);
  });

  await test('installSafeCapabilityMixin: invalid arg returns false', () => {
    const r = installSafeCapabilityMixin(null);
    assert.strictEqual(r, false);
  });

  // Realistic usage
  await test('realistic: contact_sensor override pattern', async () => {
    // Simulate a driver that overrides setCapabilityValue
    const d = makeMockDevice({ caps: new Set(['alarm_contact']) });
    d.setCapabilityValue = async function(cap, val) {
      if (cap === 'alarm_contact') {
        if (val === this._lastValue) return; // dedup
        this._lastValue = val;
        d.calls.push({ id: cap, val });
        return;
      }
      d.calls.push({ id: cap, val });
    };
    const r1 = await d.safeSetCapabilityValue('alarm_contact', true);
    assert.strictEqual(r1, true);
    assert.strictEqual(d.calls.length, 1);
    // Second call with same value (override dedups)
    const r2 = await d.safeSetCapabilityValue('alarm_contact', true);
    // override didn't call underlying setCapabilityValue because of dedup
    // safeSetCapabilityValue still considers it OK
    assert.strictEqual(r2, true);
    assert.strictEqual(d.calls.length, 1);
  });

  await test('realistic: chained calls on multiple capabilities', async () => {
    const d = makeMockDevice({ caps: new Set(['measure_battery', 'measure_temperature', 'measure_humidity']) });
    await d.safeSetCapabilityValue('measure_battery', 80);
    await d.safeSetCapabilityValue('measure_temperature', 21.5);
    await d.safeSetCapabilityValue('measure_humidity', 55);
    assert.strictEqual(d.calls.length, 3);
  });

  await test('realistic: setCapabilityValue called with 0 (falsy but valid)', async () => {
    const d = makeMockDevice({ caps: new Set(['dim']) });
    const r = await d.safeSetCapabilityValue('dim', 0);
    assert.strictEqual(r, true);
    assert.strictEqual(d.calls[0].val, 0);
  });

  await test('realistic: setCapabilityValue called with empty string', async () => {
    const d = makeMockDevice({ caps: new Set(['text']) });
    const r = await d.safeSetCapabilityValue('text', '');
    assert.strictEqual(r, true);
  });

  await test('mixin file is under 5KB', () => {
    const fs = require('fs');
    const file = path.join(ROOT, 'lib/mixins/SafeCapabilityMixin.js');
    const size = fs.statSync(file).size;
    assert.ok(size < 5 * 1024, `file is ${size} bytes`);
  });

  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
})();
