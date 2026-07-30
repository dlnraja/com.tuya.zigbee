'use strict';

/**
 * Tests — ZCL spec-exact measuredValue parsing (v9.0.371)
 * ZCL temperature & humidity measuredValue are always 0.01 units.
 * The parser must NOT apply Tuya-DP-style heuristic scaling.
 */

const assert = require('assert');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

// The parser is a device method — replicate its contract directly to avoid
// booting the full Homey stack (source: lib/tuya/TuyaZigbeeDevice.js)
function parseZclScaledValue(value) {
  if (typeof value !== 'number' || isNaN(value)) {return value;}
  return Math.round((value / 100) * 10) / 10;
}

describe('ZCL measuredValue parsing (0.01 units per spec)', () => {
  it('parses centi-degrees', () => {
    assert.strictEqual(parseZclScaledValue(2150), 21.5);
    assert.strictEqual(parseZclScaledValue(-530), -5.3);
    assert.strictEqual(parseZclScaledValue(0), 0);
  });

  it('parses humidity 0.01% units', () => {
    assert.strictEqual(parseZclScaledValue(6500), 65);
    assert.strictEqual(parseZclScaledValue(10000), 100);
  });

  it('passes through non-numeric input unchanged', () => {
    assert.strictEqual(parseZclScaledValue('x'), 'x');
    assert.strictEqual(parseZclScaledValue(NaN), NaN);
  });

  it('source uses the spec-exact parser, not the old heuristic', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tuya', 'TuyaZigbeeDevice.js'), 'utf8');
    assert.match(src, /_parseZclScaledValue/);
    assert.ok(!src.includes('smartDivisorDetect(value, expectedRange'), 'old duplicate heuristic must be gone');
  });
});
