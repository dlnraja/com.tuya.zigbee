'use strict';

/**
 * Tests — TuyaDataPointsZ2M converters (E12-E21, v9.0.368)
 * The Z2M converter layer translates raw DP values both ways
 * (to = device-bound, from = device-originated). Bugs here corrupt
 * values in BOTH directions, so round-trips are asserted.
 */

const assert = require('assert');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const {
  valueConverterBasic,
  valueConverter,
  convertBufferToNumber,
  convertDecimalValueTo4ByteHexArray,
  DATA_TYPES,
} = require('../lib/tuya/TuyaDataPointsZ2M');

describe('valueConverterBasic', () => {
  it('lookup maps both directions', () => {
    const c = valueConverterBasic.lookup({ off: 0, on: 1, previous: 2 });
    assert.strictEqual(c.to('on'), 1);
    assert.strictEqual(c.to('off'), 0);
    assert.strictEqual(c.from(2), 'previous');
    assert.strictEqual(c.from(0), 'off');
  });

  it('lookup falls back to the input for unknown values', () => {
    const c = valueConverterBasic.lookup({ a: 1 });
    assert.strictEqual(c.to('zzz'), 'zzz');
    assert.strictEqual(c.from(99), 99);
  });

  it('scale converts ranges linearly both ways', () => {
    const c = valueConverterBasic.scale(0, 1000, 0, 100);
    assert.strictEqual(c.to(500), 50);
    assert.strictEqual(c.from(50), 500);
    assert.strictEqual(c.to(0), 0);
    assert.strictEqual(c.to(1000), 100);
  });

  it('raw passes through unchanged', () => {
    const c = valueConverterBasic.raw();
    assert.strictEqual(c.to(42), 42);
    assert.strictEqual(c.from('x'), 'x');
  });

  it('divideBy multiplies on write, divides on read', () => {
    const c = valueConverterBasic.divideBy(10);
    assert.strictEqual(c.to(21.5), 215);
    assert.strictEqual(c.from(215), 21.5);
  });

  it('divideByFromOnly leaves writes untouched', () => {
    const c = valueConverterBasic.divideByFromOnly(100);
    assert.strictEqual(c.to(5), 5);
    assert.strictEqual(c.from(500), 5);
  });

  it('divideByWithLimits clamps both directions', () => {
    const c = valueConverterBasic.divideByWithLimits(10, 0, 100);
    assert.strictEqual(c.from(1500), 100);   // clamped to max
    assert.strictEqual(c.from(-50), 0);      // clamped to min
    assert.strictEqual(c.from(215), 21.5);   // in range
  });

  it('trueFalse converts only the true value', () => {
    const c = valueConverterBasic.trueFalse(1);
    assert.strictEqual(c.from(1), true);
    assert.strictEqual(c.from(0), false);
  });
});

describe('valueConverter presets', () => {
  it('onOff round-trips', () => {
    assert.strictEqual(valueConverter.onOff.to('ON'), true);
    assert.strictEqual(valueConverter.onOff.from(true), 'ON');
    assert.strictEqual(valueConverter.onOff.from(false), 'OFF');
  });

  it('powerOnBehavior has the 3 standard modes', () => {
    assert.strictEqual(valueConverter.powerOnBehavior.to('off'), 0);
    assert.strictEqual(valueConverter.powerOnBehavior.to('on'), 1);
    assert.strictEqual(valueConverter.powerOnBehavior.to('previous'), 2);
    assert.strictEqual(valueConverter.powerOnBehavior.from(2), 'previous');
  });
});

describe('buffer helpers', () => {
  it('convertBufferToNumber reads big-endian integers', () => {
    assert.strictEqual(convertBufferToNumber(Buffer.from([0, 0, 0, 215])), 215);
    assert.strictEqual(convertBufferToNumber(Buffer.from([1, 0])), 256);
  });

  it('convertDecimalValueTo4ByteHexArray encodes big-endian', () => {
    assert.deepStrictEqual([...convertDecimalValueTo4ByteHexArray(215)], [0, 0, 0, 215]);
  });

  it('round-trip: encode then decode returns the original value', () => {
    for (const v of [0, 1, 215, 65535, 100000]) {
      const buf = Buffer.from(convertDecimalValueTo4ByteHexArray(v));
      assert.strictEqual(convertBufferToNumber(buf), v);
    }
  });

  it('DATA_TYPES match the Z2M/Tuya wire format', () => {
    assert.deepStrictEqual(DATA_TYPES, { raw: 0, bool: 1, number: 2, string: 3, enum: 4, bitmap: 5 });
  });
});
