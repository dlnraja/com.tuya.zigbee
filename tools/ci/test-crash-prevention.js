#!/usr/bin/env node
'use strict';

/**
 * Test suite for lib/utils/CrashPrevention.js — v9.0.260 (P63)
 *
 * Covers the top crash patterns from Gmail diagnostics 2026-07-15:
 *  - _inferCapabilityFromValue is not a function (7x)
 *  - safeSetCapabilityValue is not a function (4x)
 *  - this.homey.app destroyed (3x)
 *  - flow card token validation (2x)
 *  - P62 setTimeout (89x) and _destroyed (48x) still covered by SafeTimerAccessor
 */

const assert = require('assert');
const {
  isDestroyed,
  markDestroyed,
  safeCall,
  safeCallAsync,
  safeSetCapabilityValue,
  safeGetApp,
  safeInvoke,
} = require('../../lib/utils/CrashPrevention');

let passed = 0;
let failed = 0;

function it(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      passed++;
      console.log(`  ✓ ${name}`);
    })
    .catch((err) => {
      failed++;
      console.log(`  ✗ ${name}`);
      console.log(`    ${err.message}`);
    });
}

(async () => {
  console.log('CrashPrevention test suite (P63)');

  await it('isDestroyed: null is destroyed', () => {
    assert.strictEqual(isDestroyed(null), true);
    assert.strictEqual(isDestroyed(undefined), true);
  });

  await it('isDestroyed: normal object is not destroyed', () => {
    assert.strictEqual(isDestroyed({}), false);
    assert.strictEqual(isDestroyed({ destroyed: false }), false);
  });

  await it('isDestroyed: respects destroyed flag', () => {
    assert.strictEqual(isDestroyed({ destroyed: true }), true);
    assert.strictEqual(isDestroyed({ _destroyed: true }), true);
  });

  await it('isDestroyed: respects homey.isDestroyed', () => {
    const d = { homey: { isDestroyed: true } };
    assert.strictEqual(isDestroyed(d), true);
  });

  await it('markDestroyed: marks object as destroyed', () => {
    const d = {};
    markDestroyed(d);
    assert.strictEqual(isDestroyed(d), true);
  });

  await it('safeCall: invokes function on valid self', () => {
    const r = safeCall({}, () => 42, 'fallback');
    assert.strictEqual(r, 42);
  });

  await it('safeCall: returns fallback when fn is not a function', () => {
    const r = safeCall({}, 'not a function', 'fallback');
    assert.strictEqual(r, 'fallback');
  });

  await it('safeCall: returns fallback when self is destroyed', () => {
    const r = safeCall({ destroyed: true }, () => 42, 'fallback');
    assert.strictEqual(r, 'fallback');
  });

  await it('safeCall: catches throws and returns fallback', () => {
    const r = safeCall({}, () => { throw new Error('boom'); }, 'fallback');
    assert.strictEqual(r, 'fallback');
  });

  await it('safeCall: passes args to fn', () => {
    const r = safeCall({}, (a, b) => a + b, 0, 2, 3);
    assert.strictEqual(r, 5);
  });

  await it('safeCallAsync: resolves to fallback on destroy', async () => {
    const r = await safeCallAsync({ destroyed: true }, async () => 42, 'fallback');
    assert.strictEqual(r, 'fallback');
  });

  await it('safeCallAsync: resolves to fallback on throw', async () => {
    const r = await safeCallAsync({}, async () => { throw new Error('boom'); }, 'fallback');
    assert.strictEqual(r, 'fallback');
  });

  await it('safeCallAsync: handles promise rejection', async () => {
    const r = await safeCallAsync({}, () => Promise.reject(new Error('boom')), 'fallback');
    assert.strictEqual(r, 'fallback');
  });

  await it('safeSetCapabilityValue: returns false on null device', async () => {
    const r = await safeSetCapabilityValue(null, 'onoff', true);
    assert.strictEqual(r, false);
  });

  await it('safeSetCapabilityValue: returns false on destroyed device', async () => {
    const d = { destroyed: true };
    const r = await safeSetCapabilityValue(d, 'onoff', true);
    assert.strictEqual(r, false);
  });

  await it('safeSetCapabilityValue: uses safeSetCapabilityValue when present', async () => {
    const d = { safeSetCapabilityValue: async () => true };
    const r = await safeSetCapabilityValue(d, 'onoff', true);
    assert.strictEqual(r, true);
  });

  await it('safeSetCapabilityValue: falls back to setCapabilityValue', async () => {
    const writes = [];
    const d = {
      hasCapability: c => c === 'onoff',
      setCapabilityValue: async (c, v) => { writes.push([c, v]); }
    };
    const r = await safeSetCapabilityValue(d, 'onoff', true);
    assert.strictEqual(r, true);
    assert.deepStrictEqual(writes, [['onoff', true]]);
  });

  await it('safeSetCapabilityValue: rejects unknown capability', async () => {
    const d = { hasCapability: () => false, setCapabilityValue: async () => {} };
    const r = await safeSetCapabilityValue(d, 'onoff', true);
    assert.strictEqual(r, false);
  });

  await it('safeSetCapabilityValue: rejects undefined value', async () => {
    let called = false;
    const d = { hasCapability: () => true, setCapabilityValue: async () => { called = true; } };
    const r = await safeSetCapabilityValue(d, 'onoff', undefined);
    assert.strictEqual(r, false);
    assert.strictEqual(called, false);
  });

  await it('safeSetCapabilityValue: rejects NaN value', async () => {
    let called = false;
    const d = { hasCapability: () => true, setCapabilityValue: async () => { called = true; } };
    const r = await safeSetCapabilityValue(d, 'measure_battery', NaN);
    assert.strictEqual(r, false);
    assert.strictEqual(called, false);
  });

  await it('safeSetCapabilityValue: catches setCapabilityValue rejection', async () => {
    const d = { hasCapability: () => true, setCapabilityValue: async () => { throw new Error('boom'); } };
    const r = await safeSetCapabilityValue(d, 'onoff', true);
    assert.strictEqual(r, false);
  });

  await it('safeGetApp: returns null on null self', () => {
    assert.strictEqual(safeGetApp(null), null);
  });

  await it('safeGetApp: returns null on missing homey', () => {
    assert.strictEqual(safeGetApp({}), null);
  });

  await it('safeGetApp: returns null on destroyed homey', () => {
    assert.strictEqual(safeGetApp({ homey: { isDestroyed: true } }), null);
  });

  await it('safeGetApp: returns app when valid', () => {
    const app = { foo: 'bar' };
    assert.deepStrictEqual(safeGetApp({ homey: { app } }), app);
  });

  await it('safeGetApp: catches throws and returns null', () => {
    const d = {
      get homey() {
        throw new Error('boom');
      }
    };
    assert.strictEqual(safeGetApp(d), null);
  });

  await it('safeInvoke: invokes method on self', () => {
    const d = { greet: name => `hi ${name}` };
    assert.strictEqual(safeInvoke(d, 'greet', 'fallback', 'world'), 'hi world');
  });

  await it('safeInvoke: returns fallback on missing method', () => {
    assert.strictEqual(safeInvoke({}, 'missing', 'fallback'), 'fallback');
  });

  await it('safeInvoke: returns fallback on destroyed self', () => {
    assert.strictEqual(safeInvoke({ destroyed: true, greet: () => 'hi' }, 'greet', 'fallback'), 'fallback');
  });

  await it('safeInvoke: returns fallback on throw', () => {
    const d = { greet: () => { throw new Error('boom'); } };
    assert.strictEqual(safeInvoke(d, 'greet', 'fallback'), 'fallback');
  });

  console.log(`\nCrashPrevention: ${passed}/${passed + failed} passed`);
  process.exit(failed > 0 ? 1 : 0);
})();
