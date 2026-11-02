'use strict';
// P3227: zero-parasite packing plan is report-only and groups mfrs by their exact sourced pid set.
const test = require('node:test');
const assert = require('node:assert');
const { planDriver } = require('../../scripts/perf/zero-parasite-plan');
const { keyOf } = require('../../scripts/maintenance/publish-sourced-restore.cjs');

test('planDriver(): parasites = sourced mfrs x pids - sourced couples; unsourced mfrs kept apart', () => {
  const s = new Map([[keyOf('_TZ3000_aaaaaaaa', 'TS0201'), { strong: true }], [keyOf('_TZ3000_bbbbbbbb', 'TS0601'), { strong: true }],
    [keyOf('_TZ3000_cccccccc', 'TS0201'), { strong: false }]]);
  const r = planDriver({ id: 'x', mfrs: ['_TZ3000_aaaaaaaa', '_tz3000_AAAAAAAA', '_TZ3000_bbbbbbbb', '_TZ3000_cccccccc', '_TZ3000_dddddddd'], pids: ['TS0201', 'TS0601'] }, s);
  assert.strictEqual(r.combos, 8);
  assert.strictEqual(r.real, 3);
  assert.strictEqual(r.parasites, 3);
  assert.strictEqual(r.unsourcedMfrs, 1);
  assert.deepStrictEqual(r.groups, [{ pids: ['ts0201'], mfrs: 2 }, { pids: ['ts0601'], mfrs: 1 }]);
  const strong = planDriver({ id: 'x', mfrs: ['_TZ3000_cccccccc'], pids: ['TS0201'] }, s, true);
  assert.strictEqual(strong.unsourcedMfrs, 1);
});
