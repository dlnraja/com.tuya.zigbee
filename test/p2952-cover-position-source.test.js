'use strict';
/* eslint-env mocha */
const assert = require('assert');
const { CoverPositionSource } = require('../lib/tuya-local/CoverPositionSource');

describe('P2952 cover position source (forum 154077 #487/#489)', () => {
  it('uses target DP2 until actual DP3 reports', () => {
    const s = new CoverPositionSource();
    assert.strictEqual(s.accept(2, 40), true);
    assert.strictEqual(s.accept(3, 63), true);
    assert.strictEqual(s.accept(2, 0), false);
    assert.strictEqual(s.accept(3, 10), true);
  });
  it('rejects out-of-range or non-numeric values and other dps', () => {
    const s = new CoverPositionSource();
    assert.strictEqual(s.accept(3, 'x'), false);
    assert.strictEqual(s.accept(3, 150), false);
    assert.strictEqual(s.actualSeen, false);
    assert.strictEqual(s.accept(5, 10), false);
  });
  it('custom dps', () => {
    const s = new CoverPositionSource({ targetDp: 101, actualDp: 102 });
    s.accept(102, 5);
    assert.strictEqual(s.accept(101, 7), false);
  });
});
