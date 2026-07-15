#!/usr/bin/env node
'use strict';

/**
 * Test suite for lib/utils/ClassExtendsGuard.js
 *
 * Covers the top "Class extends value # is not a constructor or null"
 * crash patterns from Gmail diagnostics 2026-07-15 (3x for
 * smart_knob_rotary, smart_scene_panel, wall_dimmer_1gang_1way).
 */

const assert = require('assert');
// Mock homey-zigbeedriver so the test can run outside Homey
const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function(req, ...rest) {
  if (req === 'homey-zigbeedriver') return req;
  return origResolve.call(this, req, ...rest);
};
require.cache['homey-zigbeedriver'] = {
  exports: { ZigBeeDevice: class FakeZigBeeDevice {} },
  id: 'homey-zigbeedriver',
  filename: 'homey-zigbeedriver',
  loaded: true,
  children: [],
  paths: [],
};

const { safeExtends, makeMinimalDeviceClass } = require('../../lib/utils/ClassExtendsGuard');

let passed = 0;
let failed = 0;

function it(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => { passed++; console.log(`  ✓ ${name}`); })
    .catch((err) => { failed++; console.log(`  ✗ ${name}: ${err.message}`); });
}

(async () => {
  console.log('ClassExtendsGuard test suite (P64)');

  await it('returns the loaded class when loader returns a function', () => {
    class Foo {}
    const result = safeExtends('Foo', () => Foo);
    assert.strictEqual(result, Foo);
  });

  await it('handles CommonJS default-export wrapper { default: Class }', () => {
    class Bar {}
    const result = safeExtends('Bar', () => ({ default: Bar }));
    assert.strictEqual(result, Bar);
  });

  await it('handles named export wrapper { ZigBeeDevice: Class }', () => {
    class Baz {}
    const result = safeExtends('Baz', () => ({ ZigBeeDevice: Baz }));
    assert.strictEqual(result, Baz);
  });

  await it('falls back when loader returns undefined', () => {
    const result = safeExtends('Qux', () => undefined);
    assert.strictEqual(typeof result, 'function');
  });

  await it('falls back when loader returns null', () => {
    const result = safeExtends('Qux', () => null);
    assert.strictEqual(typeof result, 'function');
  });

  await it('falls back when loader throws', () => {
    const result = safeExtends('Qux', () => { throw new Error('boom'); });
    assert.strictEqual(typeof result, 'function');
  });

  await it('falls back when loader returns a non-function', () => {
    const result = safeExtends('Qux', () => 'not a class');
    assert.strictEqual(typeof result, 'function');
  });

  await it('returned class can be extended (no throws)', () => {
    const Cls = safeExtends('Fallback', () => undefined);
    class MyDevice extends Cls {}
    const inst = new MyDevice();
    assert.ok(inst instanceof Cls);
  });

  await it('minimal stub is a valid class', () => {
    const Stub = makeMinimalDeviceClass();
    const inst = new Stub();
    assert.strictEqual(typeof inst.on, 'function');
    assert.strictEqual(typeof inst.onInit, 'function');
  });

  await it('returned class works with extends in nested chain', () => {
    const A = safeExtends('A', () => undefined);
    const B = safeExtends('B', () => undefined);
    class A1 extends A {}
    class A2 extends B {}
    assert.strictEqual(typeof A1, 'function');
    assert.strictEqual(typeof A2, 'function');
  });

  await it('minimal stub has expected prototype methods', () => {
    // Reach into the function's last-resort path by nulling ZigBeeDevice
    // (which is captured at module load). Use makeMinimalDeviceClass directly.
    const Stub = makeMinimalDeviceClass();
    const inst = new Stub();
    assert.strictEqual(typeof inst.log, 'function');
    assert.strictEqual(typeof inst.error, 'function');
    assert.strictEqual(typeof inst.onInit, 'function');
    inst.log('test');
    inst.error('test');
    return inst.onInit();
  });

  console.log(`\nClassExtendsGuard: ${passed}/${passed + failed} passed`);
  process.exit(failed > 0 ? 1 : 0);
})();
