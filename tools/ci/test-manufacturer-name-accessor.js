'use strict';

/**
 * Test suite for ManufacturerNameAccessor — v9.0.249 (P59)
 *
 * Covers:
 *  - getManufacturerName() standalone function
 *  - installManufacturerNameAccessor() idempotency
 *  - Patched method works on base class
 *  - Never throws on null / missing / destroyed device
 */

const assert = require('assert');
const {
  getManufacturerName,
  installManufacturerNameAccessor,
} = require('../../lib/utils/ManufacturerNameAccessor');

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

console.log('=== ManufacturerNameAccessor tests ===');

// 1. Standalone: null device → ''
test('standalone: null device returns ""', () => {
  assert.strictEqual(getManufacturerName(null), '');
});
test('standalone: undefined device returns ""', () => {
  assert.strictEqual(getManufacturerName(undefined), '');
});

// 2. Standalone: empty device → ''
test('standalone: empty device returns ""', () => {
  assert.strictEqual(getManufacturerName({}), '');
});

// 3. Standalone: device with getSetting → uses it
test('standalone: uses getSetting zb_manufacturer_name', () => {
  const dev = { getSetting: (k) => (k === 'zb_manufacturer_name' ? '_TZ3000_abc' : null) };
  assert.strictEqual(getManufacturerName(dev), '_TZ3000_abc');
});

// 4. Standalone: device with getStoreValue → uses it
test('standalone: uses getStoreValue manufacturerName', () => {
  const dev = {
    getSetting: () => null,
    getStoreValue: (k) => (k === 'manufacturerName' ? '_TZE200_xyz' : null),
  };
  assert.strictEqual(getManufacturerName(dev), '_TZE200_xyz');
});

// 5. Standalone: device with zclNode → uses it
test('standalone: uses zclNode.manufacturerName', () => {
  const dev = {
    getSetting: () => null,
    getStoreValue: () => null,
    getData: () => null,
    zclNode: { manufacturerName: '_TZ3000_qq' },
  };
  assert.strictEqual(getManufacturerName(dev), '_TZ3000_qq');
});

// 6. Standalone: device throws on getSetting → falls through, returns ''
test('standalone: throwing getSetting falls through to ""', () => {
  const dev = { getSetting: () => { throw new Error('boom'); } };
  assert.strictEqual(getManufacturerName(dev), '');
});

// 7. installManufacturerNameAccessor: installs on a class
test('install: patches BaseClass.prototype.getManufacturerName', () => {
  class StubBase {}
  const installed = installManufacturerNameAccessor(StubBase);
  assert.strictEqual(installed, true);
  assert.strictEqual(typeof StubBase.prototype.getManufacturerName, 'function');
});

// 8. install: idempotent — second install returns false
test('install: second call is a no-op (idempotent)', () => {
  class StubBase {}
  installManufacturerNameAccessor(StubBase);
  const second = installManufacturerNameAccessor(StubBase);
  assert.strictEqual(second, false);
});

// 9. install: null class → false
test('install: null BaseClass returns false', () => {
  assert.strictEqual(installManufacturerNameAccessor(null), false);
});

// 10. Patched method works on an instance
test('patched: this.getManufacturerName() returns mfr string', () => {
  class StubBase {}
  installManufacturerNameAccessor(StubBase);
  const inst = new StubBase();
  inst.getSetting = (k) => (k === 'zb_manufacturer_name' ? '_TZ3000_patched' : null);
  inst.getStoreValue = () => null;
  inst.getData = () => null;
  inst.zclNode = null;
  assert.strictEqual(inst.getManufacturerName(), '_TZ3000_patched');
});

// 11. Patched method returns '' on bad device
test('patched: returns "" when no source matches', () => {
  class StubBase {}
  installManufacturerNameAccessor(StubBase);
  const inst = new StubBase();
  inst.getSetting = () => null;
  inst.getStoreValue = () => null;
  inst.getData = () => null;
  inst.zclNode = null;
  inst.driver = null;
  assert.strictEqual(inst.getManufacturerName(), '');
});

// 12. Bug-fix proof: this.getManufacturerName() no longer throws on StubBase
test('bug-fix: this.getManufacturerName() does not throw "is not a function"', () => {
  class StubBase {}
  installManufacturerNameAccessor(StubBase);
  const inst = new StubBase();
  inst.getSetting = () => null;
  inst.getStoreValue = () => null;
  inst.getData = () => null;
  inst.zclNode = null;
  // The forum crash was: "this.getManufacturerName is not a function"
  // After install, calling it returns '' (not undefined, not throw)
  assert.doesNotThrow(() => inst.getManufacturerName());
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
