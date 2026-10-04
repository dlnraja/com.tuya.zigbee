'use strict';
/* eslint-env mocha */
// x-scan #110 / Z2M #12646: Tuya VALUE datapoints are signed int32 (negative temperatures,
// calibration offsets). Pins every decoder that turns a 4-byte VALUE into a number.
const assert = require('assert');
const enhanced = require('../lib/tuya/dp-parser-enhanced');

describe('Tuya VALUE DP signed decoding', () => {
  const neg5 = Buffer.from([0xff, 0xff, 0xff, 0xfb]);
  it('dp-parser-enhanced parseValue decodes -5', () => {
    assert.strictEqual(enhanced.parseValue(0x02, neg5), -5);
    assert.strictEqual(enhanced.parseValue(0x02, Buffer.from([0, 0, 0x01, 0x2c])), 300);
  });
  it('BITMAP stays unsigned', () => {
    assert.strictEqual(enhanced.parseValue(0x05, Buffer.from([0xff, 0xff, 0xff, 0xff])) > 0, true);
  });
});
