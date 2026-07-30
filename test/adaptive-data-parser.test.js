'use strict';

/**
 * Tests — AdaptiveDataParser (E22-E31, v9.0.368)
 * Edge cases of the tolerant value converters: signed temperatures,
 * divisor fallbacks, ZCL battery scale, mV discharge curve, invalid input.
 */

const assert = require('assert');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const AdaptiveDataParser = require('../lib/utils/AdaptiveDataParser');

describe('AdaptiveDataParser.toTemperature', () => {
  it('divides by 100 by default (centi-degrees)', () => {
    assert.strictEqual(AdaptiveDataParser.toTemperature(2150), 21.5);
  });

  it('handles signed 16-bit negative temperatures', () => {
    // -10.0°C sent as 65536-1000 = 64536 (signed int16)
    assert.strictEqual(AdaptiveDataParser.toTemperature(64536), -10);
  });

  it('returns null when no divisor yields a plausible temperature', () => {
    assert.strictEqual(AdaptiveDataParser.toTemperature(21500), null);
  });

  it('returns null for non-numeric input', () => {
    assert.strictEqual(AdaptiveDataParser.toTemperature('abc'), null);
    assert.strictEqual(AdaptiveDataParser.toTemperature(null), null);
  });
});

describe('AdaptiveDataParser.toHumidity', () => {
  it('divides by 100 by default', () => {
    assert.strictEqual(AdaptiveDataParser.toHumidity(6500), 65);
  });

  it('falls back to ÷10 then ÷1 when out of range', () => {
    assert.strictEqual(AdaptiveDataParser.toHumidity(650), 65);  // ÷10
    assert.strictEqual(AdaptiveDataParser.toHumidity(65), 65);   // ÷1
  });

  it('clamps to 0-100', () => {
    assert.strictEqual(AdaptiveDataParser.toHumidity(99999), 100);
    assert.strictEqual(AdaptiveDataParser.toHumidity(-5), 0);
  });
});

describe('AdaptiveDataParser.toBattery', () => {
  it('ZCL 0-200 scale: 200 → 100, 150 → 75', () => {
    assert.strictEqual(AdaptiveDataParser.toBattery(200), 100);
    assert.strictEqual(AdaptiveDataParser.toBattery(150), 75);
  });

  it('plain 0-100 passes through', () => {
    assert.strictEqual(AdaptiveDataParser.toBattery(87), 87);
  });

  it('mV discharge curve: 3000mV → 100, 2500mV → 0, midpoints interpolate', () => {
    assert.strictEqual(AdaptiveDataParser.toBattery(3000), 100);
    assert.strictEqual(AdaptiveDataParser.toBattery(2500), 0);
    const mid = AdaptiveDataParser.toBattery(2800);
    assert.ok(mid > 0 && mid < 100, `2800mV → ${mid}`);
  });

  it('returns null for invalid input', () => {
    assert.strictEqual(AdaptiveDataParser.toBattery('nope'), null);
  });
});

describe('AdaptiveDataParser.parse (structure)', () => {
  it('parses a DP object', () => {
    const r = AdaptiveDataParser.parse({ dp: 1, value: 215 }, 'test');
    assert.ok(r, 'should return a result');
  });

  it('does not throw on garbage input', () => {
    assert.doesNotThrow(() => AdaptiveDataParser.parse(undefined, 'test'));
    assert.doesNotThrow(() => AdaptiveDataParser.parse(42, 'test'));
    assert.doesNotThrow(() => AdaptiveDataParser.parse({ weird: true }, 'test'));
  });
});
