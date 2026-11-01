'use strict';
const assert = require('assert');
const { isUnsetFadingTime, zm25elDirectionDp } = require('../lib/tuya/UpstreamDpGuards');
describe('P3150 upstream DP guards (ZHA #5514, #4817)', () => {
  it('drops 1youk3hj DP12 unset sentinel', () => {
    assert.strictEqual(isUnsetFadingTime('_TZE204_1youk3hj', 12, 0xFFFFFF08), true);
    assert.strictEqual(isUnsetFadingTime('_TZE204_1youk3hj', 12, -248), true);
    assert.strictEqual(isUnsetFadingTime('_TZE204_1youk3hj', 12, 5), false);
    assert.strictEqual(isUnsetFadingTime('_TZE204_1youk3hj', 12, 600), false);
  });
  it('leaves other mfrs and DPs alone', () => {
    assert.strictEqual(isUnsetFadingTime('_TZE204_ya4ft0w4', 12, 0xFFFFFF08), false);
    assert.strictEqual(isUnsetFadingTime('_TZE204_1youk3hj', 102, 0xFFFFFF08), false);
  });
  it('ZM25EL DP5 enum both ways', () => {
    assert.deepStrictEqual(zm25elDirectionDp('_TZE200_68nvbio9', true), { dp: 5, value: 1, type: 'enum' });
    assert.deepStrictEqual(zm25elDirectionDp('_TZE200_pw7mji0l', false), { dp: 5, value: 0, type: 'enum' });
    assert.strictEqual(zm25elDirectionDp('_TZE200_other', true), null);
  });
});
