'use strict';

// P3030: numeric-string DP values decode like numbers (lesson from topic 35206 #244/#258/#1626).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { normalizeDpScalar } = require('../../lib/covers/normalizeDpScalar');

test('P3030 numeric strings become numbers', () => {
  assert.strictEqual(normalizeDpScalar('2'), 2);
  assert.strictEqual(normalizeDpScalar(' 50 '), 50);
  assert.strictEqual(normalizeDpScalar('-3.5'), -3.5);
  assert.strictEqual(normalizeDpScalar('0'), 0);
});

test('P3030 everything else passes through unchanged', () => {
  for (const v of ['open', 'stop', '', ' ', '1e3', '0x02', '12abc', true, null, undefined, 7]) {
    assert.strictEqual(normalizeDpScalar(v), v);
  }
  const buf = Buffer.from([1]);
  assert.strictEqual(normalizeDpScalar(buf), buf);
  assert.strictEqual(normalizeDpScalar('9'.repeat(40)), '9'.repeat(40), 'long strings left alone');
});

test('P3030 cover DP1 transform now reads "2" as close', () => {
  // Same mapping as UnifiedCoverBase DP1, fed through the normalizer first.
  const dp1 = (v) => v === 0 || v === 'open' ? 'up' : v === 1 || v === 'stop' ? 'idle' : v === 2 || v === 'close' ? 'down' : 'idle';
  assert.strictEqual(dp1('2'), 'idle', 'the bug: string 2 fell through to idle');
  assert.strictEqual(dp1(normalizeDpScalar('2')), 'down');
  assert.strictEqual(dp1(normalizeDpScalar('open')), 'up');
});

test('P3030 UnifiedCoverBase normalizes before transforms', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'lib/devices/UnifiedCoverBase.js'), 'utf8');
  const i = src.indexOf("require('../covers/normalizeDpScalar').normalizeDpScalar(value)");
  assert.ok(i > 0);
  assert.ok(i < src.indexOf('if (mapping.transform) {'), 'normalize happens before the transform');
});
