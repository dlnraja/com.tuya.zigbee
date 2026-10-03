'use strict';
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const { mergeIndex } = require('../../scripts/scanners/johan-canonical-index');

describe('Spec 009: discussions merged into the Johan index', () => {
  it('discussion item flagged needsDeepRead with a discussions link, no body stored', () => {
    const idx = mergeIndex(null,
      [{ n: 2001, t: 'Q', state: 'open', kind: 'discussion', user: 'someone', body: 'secret text' }],
      [{ id: 'DC_1', user: 'JohanBendz', created_at: '2026-10-03T00:00:00Z', issue: '2001', kind: 'discussion', body: '`_TZE200_abcdefgh` / TS0601' }]);
    const e = idx.issues[2001];
    assert.strictEqual(e.kind, 'discussion');
    assert.strictEqual(e.needsDeepRead, true);
    assert.match(e.lastComment.url, /\/discussions\/2001#/);
    assert.ok(!JSON.stringify(idx).includes('secret text'));
    assert.deepStrictEqual(e.identities[0], ['_TZE200_abcdefgh', 'TS0601']);
  });
});
