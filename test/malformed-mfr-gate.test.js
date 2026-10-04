'use strict';
/* eslint-env mocha */
const assert = require('assert');
const path = require('path');
const { isMalformedMfr, scan, loadBaseline } = require('../tools/ci/malformed-mfr-gate');

describe('R16 malformed manufacturerName gate', () => {
  it('rejects OCR digit-padded and placeholder names', () => {
    for (const m of ['_TZE2841000000_hdml1aav', '_tze28c1000000_81yrt3lo', '_TZE28C100000_RZDKN5RX', '_TZE200_xxxxx', '_TZE200_ABC123']) {
      assert.strictEqual(isMalformedMfr(m), true, m);
    }
  });
  it('accepts real names', () => {
    for (const m of ['_TZE284_hdml1aav', '_TZE200_ntcy3xu1', '_TZ3000_kfu8zapd', 'Zbeacon', 'HOBEIAN']) {
      assert.strictEqual(isMalformedMfr(m), false, m);
    }
  });
  it('repository has no malformed names outside the shrink-only legacy baseline', () => {
    assert.deepStrictEqual(scan(path.join(__dirname, '..')), []);
  });
  it('PR #512 names are not added beyond the legacy baseline', () => {
    const base = loadBaseline(path.join(__dirname, '..'));
    assert.ok(!base.has('_tze2841000000_newdevice'));
  });
});
