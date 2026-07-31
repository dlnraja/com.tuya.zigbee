'use strict';

/**
 * Tests — flow DP send hardening (v9.0.387)
 * Validation of tuya_dp_send + tuya_dp_send_typed inputs.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'lib', 'flow', 'UniversalFlowCardLoader.js'), 'utf8');

// Reproduce the validation logic from the loader (contract test)
function validatePlain(dp, raw) {
  const n = Number(dp);
  if (!Number.isInteger(n) || n < 1 || n > 255) {return null;}
  if (raw === 'true' || raw === true) {return true;}
  if (raw === 'false' || raw === false) {return false;}
  if (typeof raw === 'number' && Number.isFinite(raw) && Math.abs(raw) <= 2147483647) {return Math.round(raw);}
  if (typeof raw === 'string') {
    const num = Number(raw);
    if (raw.trim() !== '' && Number.isFinite(num) && Math.abs(num) <= 2147483647) {return Math.round(num);}
    if (raw.length <= 255) {return raw;}
    return null;
  }
  return null;
}

function validateTyped(type, raw) {
  raw = String(raw ?? '');
  switch (type) {
  case 'bool': return /^(true|false|0|1)$/i.test(raw) ? /^(true|1)$/i.test(raw) : null;
  case 'value': {
    const n = Number(raw);
    return Number.isFinite(n) && Math.abs(n) <= 2147483647 ? Math.round(n) : null;
  }
  case 'enum': {
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 && n <= 255 ? n : null;
  }
  case 'string': return raw.length <= 255 ? raw : null;
  case 'raw': return /^([0-9a-fA-F]{2}){1,64}$/.test(raw.replace(/\s+/g, '')) ? Buffer.from(raw.replace(/\s+/g, ''), 'hex') : null;
  case 'bitmap': {
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 && n <= 4294967295 ? n : null;
  }
  default: return null;
  }
}

describe('tuya_dp_send validation', () => {
  it('accepts valid DP numbers and value types', () => {
    assert.strictEqual(validatePlain(1, true), true);
    assert.strictEqual(validatePlain(38, '215'), 215);
    assert.strictEqual(validatePlain(255, -500), -500);
    assert.strictEqual(validatePlain(4, 'auto'), 'auto');
  });

  it('rejects invalid DP numbers', () => {
    assert.strictEqual(validatePlain(0, 1), null);
    assert.strictEqual(validatePlain(256, 1), null);
    assert.strictEqual(validatePlain(1.5, 1), null);
    assert.strictEqual(validatePlain(NaN, 1), null);
  });

  it('rejects oversized strings and objects', () => {
    assert.strictEqual(validatePlain(1, 'x'.repeat(256)), null);
    assert.strictEqual(validatePlain(1, { a: 1 }), null);
    assert.strictEqual(validatePlain(1, [1, 2]), null);
  });
});

describe('tuya_dp_send_typed validation', () => {
  it('validates per type', () => {
    assert.strictEqual(validateTyped('bool', 'true'), true);
    assert.strictEqual(validateTyped('bool', '0'), false);
    assert.strictEqual(validateTyped('value', '2147483647'), 2147483647);
    assert.strictEqual(validateTyped('enum', 12), 12);
    assert.strictEqual(validateTyped('string', 'mode_auto'), 'mode_auto');
    assert.deepStrictEqual(validateTyped('raw', 'a1b2'), Buffer.from([0xa1, 0xb2]));
    assert.strictEqual(validateTyped('bitmap', 255), 255);
  });

  it('rejects invalid per-type values', () => {
    assert.strictEqual(validateTyped('bool', 'maybe'), null);
    assert.strictEqual(validateTyped('value', '99999999999'), null);
    assert.strictEqual(validateTyped('enum', 300), null);
    assert.strictEqual(validateTyped('enum', -1), null);
    assert.strictEqual(validateTyped('string', 'x'.repeat(300)), null);
    assert.strictEqual(validateTyped('raw', 'zzzz'), null);
    assert.strictEqual(validateTyped('raw', 'abc'), null); // longueur impaire
    assert.strictEqual(validateTyped('bitmap', -5), null);
    assert.strictEqual(validateTyped('wat', 1), null);
  });

  it('loader registers both handlers', () => {
    assert.match(src, /_registerTypedDpCards/);
    assert.match(src, /tuya_dp_send_typed/);
    assert.match(src, /Number\.isInteger\(dp\) \|\| dp < 1 \|\| dp > 255/);
  });
});
