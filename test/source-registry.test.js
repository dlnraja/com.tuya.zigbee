'use strict';
/* eslint-env mocha */
const assert = require('assert');
const { extract, isDue, CADENCE_MS } = require('../.github/scripts/source-registry');

describe('source registry (W10 change-driven ingestion)', () => {
  it('extracts couples, DPs and signals in a case-tolerant way', () => {
    const x = extract('Add _TZE204_r6kfl9ta TS0601: dp 1 noise, dp: 16; inverted contact workaround');
    assert.deepStrictEqual(x.mfrs, ['_TZE204_r6kfl9ta']);
    assert.deepStrictEqual(x.pids, ['TS0601']);
    assert.deepStrictEqual(x.dps, [1, 16]);
    assert.strictEqual(x.bug, true);
    assert.strictEqual(x.quirk, true);
  });
  it('honours cadence and force', () => {
    const now = Date.now();
    assert.strictEqual(isDue({ cadence: 'daily' }, { checkedAt: new Date(now - 3600e3).toISOString() }, now, false), false);
    assert.strictEqual(isDue({ cadence: 'daily' }, { checkedAt: new Date(now - CADENCE_MS.daily - 1).toISOString() }, now, false), true);
    assert.strictEqual(isDue({ cadence: 'monthly' }, {}, now, false), true);
    assert.strictEqual(isDue({ cadence: 'weekly' }, { checkedAt: new Date(now).toISOString() }, now, true), true);
  });
  it('registry entries are well-formed', () => {
    const reg = require('../data/sources/registry.json');
    const ids = new Set();
    for (const s of reg.sources) {
      assert.ok(s.id && !ids.has(s.id), `unique id ${s.id}`);
      ids.add(s.id);
      assert.ok(['github', 'github-forks', 'discourse', 'discourse-category', 'page', 'news-index'] /* discourse-category: scanDiscourseCategory (source-registry.js) */.includes(s.type), s.id);
      assert.ok(s.credit, `credit for ${s.id}`);
      assert.ok(CADENCE_MS[s.cadence], `cadence for ${s.id}`);
    }
  });
});
