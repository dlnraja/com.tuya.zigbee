'use strict';

/**
 * Tests — smart scaling heuristics (v9.0.364)
 * Covers the dynamic divisor/multiplier intelligence:
 *  - prefix resolution of sub-capabilities (measure_temperature.* etc.)
 *  - explicit sub-capability precedence (measure_luminance.distance)
 *  - curated multipliers (battery 0-50 → ×2 = divisor 0.5)
 *  - self-validating cache (no poisoning by atypical first samples)
 *  - ProductValueValidator: smallest plausible divisor (issue #513 root cause)
 */

const assert = require('assert');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const {
  smartParse,
  smartDivisorDetect,
  clearDivisorCache,
  capBaseName,
  getValidRange,
} = require('../lib/managers/SmartDivisorManager');
const { ProductValueValidator } = require('../lib/ProductValueValidator');

describe('SmartDivisor — prefix resolution (v9.0.364)', () => {
  it('resolves sub-capabilities to their base', () => {
    assert.strictEqual(capBaseName('measure_temperature.floor'), 'measure_temperature');
    assert.strictEqual(capBaseName('measure_humidity.outdoor'), 'measure_humidity');
    // explicit entry (issue #513) keeps precedence over the base
    assert.strictEqual(capBaseName('measure_temperature.probe'), 'measure_temperature.probe');
  });

  it('keeps explicit sub-capability entries (distance stays ÷100)', () => {
    assert.strictEqual(capBaseName('measure_luminance.distance'), 'measure_luminance.distance');
    assert.deepStrictEqual(getValidRange('measure_luminance.distance'), { min: 0, max: 50 });
  });

  it('falls back to base range for unknown sub-capabilities', () => {
    assert.deepStrictEqual(getValidRange('measure_temperature.floor'), { min: -40, max: 100 });
  });

  it('scales any measure_temperature.* sub-capability by 10', () => {
    clearDivisorCache();
    const floor = smartParse(215, 28, { capability: 'measure_temperature.floor', deviceId: 't1' });
    assert.strictEqual(floor, 21.5);
  });
});

describe('SmartDivisor — curated multipliers', () => {
  it('battery 0-50 scale: raw 50 → 100% (divisor 0.5)', () => {
    clearDivisorCache();
    const batt = smartParse(50, 4, {
      manufacturerName: '_TZE284_vvmbj46n',
      capability: 'measure_battery',
      deviceId: 't2',
    });
    assert.strictEqual(batt, 100);
  });
});

describe('SmartDivisor — self-validating cache', () => {
  it('rejects a poisoned cached divisor when a new sample is out of range', () => {
    clearDivisorCache();
    // pm25 has no curated divisor → pure auto-detect path
    const first = smartDivisorDetect(500, 5, { capability: 'measure_pm25', deviceId: 't3' });
    assert.strictEqual(first, 1); // 500/1 in range → learned 1
    // Next report arrives raw ×100 (50000): cached 1 gives 50000 → out of range → re-detect
    const second = smartDivisorDetect(50000, 5, { capability: 'measure_pm25', deviceId: 't3' });
    assert.strictEqual(second, 100);
  });

  it('does not learn from a zero raw value', () => {
    clearDivisorCache();
    smartDivisorDetect(0, 9, { capability: 'measure_temperature', deviceId: 't4' });
    // zero must not poison the cache: a normal raw value still auto-detects
    const d = smartDivisorDetect(215, 9, { capability: 'measure_temperature', deviceId: 't4' });
    assert.strictEqual(d, 10);
  });
});

describe('ProductValueValidator — smallest plausible divisor', () => {
  it('corrects 215 → 21.5 (÷10), not 2.15 (÷100) — issue #513', () => {
    const r = ProductValueValidator.validateAndCorrect(215, 'measure_temperature.probe', 'climate_sensor');
    assert.strictEqual(r.correctedValue, 21.5);
    assert.strictEqual(r.divisorApplied, 10);
  });

  it('still corrects genuine ×100 values: 2150 → 21.5 (÷100)', () => {
    const r = ProductValueValidator.validateAndCorrect(2150, 'measure_temperature.probe', 'climate_sensor');
    assert.strictEqual(r.correctedValue, 21.5);
    assert.strictEqual(r.divisorApplied, 100);
  });

  it('does not mutate the shared PRODUCT_RULES arrays', () => {
    const before = [...ProductValueValidator.PRODUCT_RULES.climate_sensor['measure_temperature.probe'].possibleDivisors];
    ProductValueValidator.validateAndCorrect(215, 'measure_temperature.probe', 'climate_sensor');
    const after = ProductValueValidator.PRODUCT_RULES.climate_sensor['measure_temperature.probe'].possibleDivisors;
    assert.deepStrictEqual(after, before);
  });
});
