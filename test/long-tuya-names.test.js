'use strict';
/* eslint-env mocha */
// x-scan #111: 23-char Tuya names (_TZE28C1000000_*, _TZE2841000000_*) must never be truncated
// or caught by a short-prefix rule; exact and case-insensitive lookups must both resolve.
const assert = require('assert');
const DB = require('../lib/tuya/DeviceFingerprintDB.js');

describe('long Tuya manufacturer names', () => {
  it('resolve exactly and case-insensitively', () => {
    for (const m of ['_TZE28C1000000_jtbgusdc', '_tze28c1000000_JTBGUSDC']) {
      const fp = DB.getFingerprint(m, 'TS0601') || DB.getFingerprint(m);
      assert.ok(fp, m);
    }
    const soil = DB.getFingerprint('_TZE2841000000_hdml1aav', 'TS0601') || DB.getFingerprint('_TZE2841000000_hdml1aav');
    assert.ok(soil);
  });
  it('do not resolve when the suffix is cut', () => {
    assert.ok(!DB.getFingerprint('_TZE28C1000000_', 'TS0601'));
    assert.ok(!DB.getFingerprint('_TZE28C1000000_jtbg', 'TS0601'));
  });
});
