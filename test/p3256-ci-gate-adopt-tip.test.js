'use strict';
// P3256: a code-identical tip (bot [skip ci] commits) must not hold master as "superseded" forever.
const assert = require('assert');
const { missingCiAction } = require('../.github/scripts/athom-publish-policy.js');

describe('P3256 CI gate adopts a code-identical tip', () => {
  it('adopts the tip when it is code-identical to the gated SHA', () => {
    assert.strictEqual(missingCiAction({ state: 'missing', sha: 'a', tip: 'b', tipCodeIdentical: true }), 'adopt-tip');
  });
  it('still holds as superseded when the tip changed code or is unknown', () => {
    assert.strictEqual(missingCiAction({ state: 'missing', sha: 'a', tip: 'b', tipCodeIdentical: false }), 'superseded');
    assert.strictEqual(missingCiAction({ state: 'missing', sha: 'a', tip: 'b' }), 'superseded');
  });
  it('keeps the old answers for tip == sha and non-missing states', () => {
    assert.strictEqual(missingCiAction({ state: 'missing', sha: 'a', tip: 'a' }), 'dispatch');
    assert.strictEqual(missingCiAction({ state: 'green', sha: 'a', tip: 'b', tipCodeIdentical: true }), 'wait');
  });
});
