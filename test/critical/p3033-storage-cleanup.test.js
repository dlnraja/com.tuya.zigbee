'use strict';
// P3033: CI storage cleanup — cache family grouping, keep/delete selection, artifact age rule, workflow parsing.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const sc = require(path.join(ROOT, 'scripts', 'ci', 'storage-cleanup.js'));
const DAY = 86400000;
const NOW = Date.parse('2026-10-25T01:00:00Z');
const iso = (daysAgo) => new Date(NOW - (daysAgo * DAY)).toISOString();
const H = 'a'.repeat(64);
const H2 = 'b'.repeat(64);

function cache(id, key, ref, createdDaysAgo, accessedDaysAgo = createdDaysAgo, size = 1000) {
  return { id, key, ref, size_in_bytes: size, created_at: iso(createdDaysAgo), last_accessed_at: iso(accessedDaysAgo) };
}
const ids = (rows) => rows.map((r) => r.id).sort((a, b) => a - b);

test('cacheFamily strips trailing hashes, run ids and versions but keeps the meaningful middle', () => {
  assert.strictEqual(sc.cacheFamily(`node-cache-Linux-x64-npm-${H}`), 'node-cache-Linux-x64-npm');
  assert.strictEqual(sc.cacheFamily('xr-master-diags-40138583286'), 'xr-master-diags');
  assert.strictEqual(sc.cacheFamily('quirks-db-weekly-123456'), 'quirks-db-weekly');
  assert.strictEqual(sc.cacheFamily(`Linux-intel-cache-${H}-Forum Poll (P69)`), 'Linux-intel-cache-*-Forum Poll (P69)');
  assert.strictEqual(sc.cacheFamily('tool-v1.2.3'), 'tool');
  assert.notStrictEqual(sc.cacheFamily(`Linux-intel-cache-${H}-A`), sc.cacheFamily(`Linux-intel-cache-${H}-B`));
});

test('newest per family and ref is kept, older entries are superseded', () => {
  const caches = [
    cache(1, `node-cache-Linux-x64-npm-${H}`, 'refs/heads/master', 3),
    cache(2, `node-cache-Linux-x64-npm-${H2}`, 'refs/heads/master', 1),
    cache(3, `node-cache-Linux-x64-npm-${H}`, 'refs/heads/stable-v5', 2),
  ];
  const plan = sc.selectCacheDeletions(caches, { now: NOW, existingRefs: null });
  assert.deepStrictEqual(ids(plan.delete), [1]);
  assert.strictEqual(plan.delete[0].reason, 'superseded');
  assert.deepStrictEqual(ids(plan.keep), [2, 3]);
});

test('newest on master / stable-v5 / bastien-home is never deleted, even when idle for months', () => {
  const caches = ['master', 'stable-v5', 'bastien-home'].map((b, i) => cache(i + 1, `rules-digest-${H}`, `refs/heads/${b}`, 90));
  const plan = sc.selectCacheDeletions(caches, { now: NOW, existingRefs: new Set() });
  assert.strictEqual(plan.delete.length, 0);
  assert.ok(plan.keep.every((k) => k.reason === 'newest-protected-ref'));
});

test('idle 7+ days: deleted on a live feature branch, kept when it is a state family', () => {
  const refs = new Set(['refs/heads/feat/x']);
  const caches = [
    cache(1, `node-cache-Linux-x64-npm-${H}`, 'refs/heads/feat/x', 10, 8),
    cache(2, 'kb-mirrors-777777', 'refs/heads/feat/x', 30, 30),
    cache(3, 'xr-feat-forum-555555', 'refs/heads/feat/x', 30, 30),
    cache(4, `node-cache-Linux-x64-npm-${H}`, 'refs/heads/feat/y', 1, 1),
  ];
  const plan = sc.selectCacheDeletions(caches, { now: NOW, existingRefs: new Set([...refs, 'refs/heads/feat/y']), stateKeys: ['xr-*-*-*'] });
  assert.deepStrictEqual(ids(plan.delete), [1]);
  assert.strictEqual(plan.delete[0].reason, 'idle');
  const kept = Object.fromEntries(plan.keep.map((k) => [k.id, k.reason]));
  assert.strictEqual(kept[2], 'newest-state-family'); // state word in the name
  assert.strictEqual(kept[3], 'newest-state-family'); // run_id keyed glob from the workflows
  assert.strictEqual(kept[4], 'newest');
});

test('caches of deleted branches and closed PRs are deleted; unknown ref list deletes nothing on that rule', () => {
  const caches = [
    cache(1, 'gmail-diag-state-1', 'refs/pull/12/merge', 1),
    cache(2, 'gmail-diag-state-2', 'refs/pull/13/merge', 1),
    cache(3, 'gmail-diag-state-3', 'refs/heads/kb/import', 1),
    cache(4, 'gmail-diag-state-4', 'refs/heads/master', 1),
    cache(5, 'gmail-diag-state-5', 'refs/tags/v1', 1),
  ];
  const live = new Set(['refs/pull/13/merge', 'refs/pull/13/head']); // master missing on purpose: still protected
  const plan = sc.selectCacheDeletions(caches, { now: NOW, existingRefs: live });
  assert.deepStrictEqual(ids(plan.delete), [1, 3]);
  assert.ok(plan.delete.every((d) => d.reason === 'ref-gone'));
  assert.strictEqual(sc.selectCacheDeletions(caches, { now: NOW, existingRefs: null }).delete.length, 0);
});

test('deletions are capped (largest first) and the rest is reported as capped', () => {
  const caches = [1, 2, 3, 4].map((i) => cache(i, `x-${i}`, 'refs/heads/gone', 1, 1, i * 100));
  const plan = sc.selectCacheDeletions(caches, { now: NOW, existingRefs: new Set(), maxDeletions: 2 });
  assert.deepStrictEqual(ids(plan.delete), [3, 4]);
  assert.strictEqual(plan.capped, 2);
  assert.ok(plan.keep.some((k) => k.reason === 'capped:ref-gone'));
});

test('artifacts: older than 14 days deleted, newest of a name read by a later run kept, expired ignored', () => {
  const a = (id, name, days, expired = false) => ({ id, name, size_in_bytes: 10, created_at: iso(days), expired });
  const arts = [
    a(1, 'nightly-audit-1', 20), a(2, 'nightly-audit-2', 3),
    a(3, 'forum-poll', 30), a(4, 'forum-poll', 40),
    a(5, 'digest-leads-homey-9', 20), a(6, 'old', 50, true),
  ];
  const plan = sc.selectArtifactDeletions(arts, { now: NOW, consumers: ['forum-poll', 'digest-leads-*'] });
  assert.deepStrictEqual(ids(plan.delete), [1, 4]);
  const kept = Object.fromEntries(plan.keep.map((k) => [k.id, k.reason]));
  assert.strictEqual(kept[2], 'recent');
  assert.strictEqual(kept[3], 'newest-consumed-later');
  assert.strictEqual(kept[5], 'newest-consumed-later');
  assert.ok(!(6 in kept));
});

test('workflow parsing: cache keys become globs, run_id keys are state; cross-run downloads are found', () => {
  const yml = [
    'steps:',
    '  - uses: actions/cache@abc # v4',
    '    with:',
    '      path: x',
    '      key: gmail-diag-state-${{ github.run_id }}',
    '      restore-keys: gmail-diag-state-',
    '  - uses: actions/cache/restore@abc',
    '    with:',
    "      key: ${{ runner.os }}-intel-cache-${{ hashFiles('package-lock.json') }}-${{ github.workflow }}",
    '  - uses: actions/cache@abc',
    '    with:',
    '      key: ${{ github.run_id }}',
    '  - run: gh run download "$RID" -R "$R" -n sanitized-diagnostics-report -D d',
    "  - run: gh run download \"$RID\" -p 'digest-leads-*' -D x",
    '  - uses: actions/download-artifact@abc',
    '    with:',
    '      name: same-run-only',
  ].join('\n');
  const keys = sc.parseWorkflowCacheKeys(yml);
  assert.deepStrictEqual(keys.map((k) => [k.glob, k.state]), [['gmail-diag-state-*', true], ['Linux-intel-cache-*-*', false]]);
  assert.deepStrictEqual(sc.parseWorkflowArtifactConsumers(yml).sort(), ['digest-leads-*', 'sanitized-diagnostics-report']);
});

test('the real workflows declare state caches and cross-run artifact readers the cleanup must respect', () => {
  const wfs = sc.readWorkflows(ROOT);
  const globs = wfs.flatMap((w) => sc.parseWorkflowCacheKeys(w.text)).filter((k) => k.state).map((k) => k.glob);
  for (const g of ['gmail-diag-state-*', 'resolver-state-*', 'diag-ledger-queue-*', 'quirks-db-*']) {assert.ok(globs.includes(g), g);}
  assert.ok(globs.some((g) => g.startsWith('xr-')), 'cross-research composite action cache');
  const consumers = wfs.flatMap((w) => sc.parseWorkflowArtifactConsumers(w.text));
  assert.ok(consumers.includes('forum-poll'));
});

test('quota uses config/platform-limits.json gha_cache_gb and warns from 80 %', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'platform-limits.json'), 'utf8'));
  const q = sc.cacheQuota(cfg);
  assert.strictEqual(q.limitGb, cfg.limits.gha_cache_gb.limit);
  assert.strictEqual(q.warnPct, 80);
  assert.strictEqual(sc.quotaState(7.9e9, q).warn, false);
  assert.strictEqual(sc.quotaState(8.1e9, q).warn, true);
});

test('workflow: daily schedule + dry_run dispatch, minimal permissions, dry run unless asked', () => {
  const y = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'storage-cleanup.yml'), 'utf8');
  assert.match(y, /cron:\s*'30 3 \* \* \*'/);
  assert.match(y, /workflow_dispatch:[\s\S]*dry_run:/);
  assert.match(y, /actions:\s*write/);
  assert.match(y, /contents:\s*read/);
  assert.doesNotMatch(y, /contents:\s*write/);
  assert.match(y, /scripts\/ci\/storage-cleanup\.js/);
});

test('summary lists before/after/deleted and is plain markdown', () => {
  const plan = { delete: [], keep: [] };
  const md = sc.buildSummary({
    dryRun: true, before: { caches: { count: 2, bytes: 2e9 }, artifacts: { count: 1, bytes: 1 } },
    after: { caches: { count: 1, bytes: 1e9 }, artifacts: { count: 1, bytes: 1 }, quotaPct: 10, quotaWarn: false },
    deleted: { caches: { count: 1, bytes: 1e9 }, artifacts: { count: 0, bytes: 0 } },
    quota: { limitGb: 10, warnPct: 80 }, cachePlan: plan, artifactPlan: plan, errors: [], stateFamilies: [], consumers: [],
  });
  assert.match(md, /DRY RUN/);
  assert.match(md, /\| caches \| 2 \/ 2\.00 GB \| 1 \/ 1\.00 GB \| 1 \/ 1\.00 GB \|/);
});
