'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const USB = { _p3065ApplyTransform: require(path.join(ROOT, 'lib/utils/dp-transform')).applyTransform };
const { boolean, enumMap, numeric } = require(path.join(ROOT, 'lib/converters/ValueConverterRegistry'));

test('P3065 applyTransform handles functions, { fromDevice } converters and absent transforms', () => {
  const f = USB._p3065ApplyTransform;
  assert.strictEqual(f((v) => v * 2, 21), 42);
  assert.strictEqual(f(boolean(), 1), true);
  assert.strictEqual(f(boolean(), 0), false);
  assert.strictEqual(f(numeric({ divisor: 10 }), 215), 21.5);
  assert.strictEqual(f(enumMap({ 0: 'off', 1: 'heat' }), 1), 'heat');
  assert.strictEqual(f(undefined, 7), 7);
  assert.strictEqual(f({ fromDevice() { throw new Error('x'); } }, 7), 7);
});

test('P3065 main DP path applies { fromDevice } converters instead of ignoring them', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedSensorBase.js'), 'utf8');
  assert.match(src, /else if \(transform && typeof transform\.fromDevice === 'function'\)/);
  assert.ok(!src.includes('contextMapping.transform ? contextMapping.transform(parsedValue)'));
  assert.ok(!src.includes('autoMapping.transform ? autoMapping.transform(parsedValue)'));
});

test('P3065 UnifiedSensorBase exposes the shared transform helper', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedSensorBase.js'), 'utf8');
  assert.match(src, /UnifiedSensorBase\._p3065ApplyTransform = require\('\.\.\/utils\/dp-transform'\)\.applyTransform/);
});
