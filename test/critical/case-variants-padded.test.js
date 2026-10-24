'use strict';
const { describe, it } = require('../_support/dual-runner'); // P3020: same file under node --test and mocha
const assert = require('assert');
const { dropPaddedTwins } = require('../../tools/ci/ensure-case-variants');
describe('P-KB4 case variants keep padded names byte-exact', () => {
  it('drops a trimmed/lower twin of a padded name that was not there before', () => {
    assert.deepStrictEqual(dropPaddedTwins(['AOYAN  '], ['AOYAN  ', 'aoyan', 'aoyan  ']), ['AOYAN  ']);
  });
  it('keeps existing explicit forms and unrelated variants', () => {
    assert.deepStrictEqual(dropPaddedTwins(['AOYAN', 'AOYAN  '], ['AOYAN', 'AOYAN  ', '_TZ3000_x', '_tz3000_x']), ['AOYAN', 'AOYAN  ', '_TZ3000_x', '_tz3000_x']);
    assert.deepStrictEqual(dropPaddedTwins(['_TZ3000_A'], ['_TZ3000_A', '_tz3000_a']), ['_TZ3000_A', '_tz3000_a']);
  });
});
