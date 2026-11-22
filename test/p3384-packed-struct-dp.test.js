'use strict';

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const {
  decodeInt32Be,
  getField,
  rememberReport,
  buildWrite,
  encodeBase64,
} = require('../lib/tuya-local/PackedStructDP');

// Forum 154077 #476: DP 118 at displayed temps 30, 31, 40 (base64).
const SAMPLES = {
  30: 'AAAAAgAAAAUAAAAyAAAADAAAAB4AAAABAAAAAAAAABcAAAAeAAAARgAAAEEAAAAAAAAAFwAAAAYAAAAAAAAAAAAAAB4AAAABAAAAAQAAAB4=',
  31: 'AAAAAgAAAAUAAAAyAAAADAAAAB8AAAABAAAAAAAAABcAAAAeAAAARgAAAEEAAAAAAAAAFwAAAAYAAAAAAAAAAAAAAB4AAAABAAAAAQAAAB4=',
  40: 'AAAAAgAAAAUAAAAyAAAADAAAACEAAAABAAAAAAAAABcAAAAeAAAARgAAAEEAAAAAAAAAFwAAAAYAAAAAAAAAAAAAAB4AAAABAAAAAQAAAB4=',
};

describe('P3384 PackedStructDP (forum 154077 #475-#479, DP118 field 5)', () => {
  it('decodes int32be fields and reads field 5 as the changing setpoint', () => {
    assert.strictEqual(getField(decodeInt32Be(SAMPLES[30]), 5), 30);
    assert.strictEqual(getField(decodeInt32Be(SAMPLES[31]), 5), 31);
    assert.strictEqual(getField(decodeInt32Be(SAMPLES[40]), 5), 33);
  });

  it('writes only field 5 from the last reported block', () => {
    const store = rememberReport({}, 118, SAMPLES[30]);
    const wr = buildWrite(store, 118, 5, 40);
    assert.strictEqual(wr.ok, true);
    const decoded = decodeInt32Be(wr.payload);
    assert.strictEqual(getField(decoded, 5), 40);
    assert.strictEqual(getField(decoded, 1), 2);
    assert.strictEqual(getField(decoded, 3), 50);
    assert.strictEqual(encodeBase64(decoded), wr.payload);
  });

  it('refuses to invent a write when no block has been reported', () => {
    const wr = buildWrite({}, 118, 5, 30);
    assert.strictEqual(wr.ok, false);
    assert.strictEqual(wr.reason, 'no-reported-block');
  });
});
