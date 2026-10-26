'use strict';
// P3073 §4 (t590u): upstream watch — per-source cursors, "since last time" deltas, bounded ledger,
// low frequency, Reddit stops at the first refusal, weekly report built by report-writer, no network here.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const W = require(path.join(__dirname, '..', '..', 'scripts', 'learning', 'upstream-watch.cjs'));
const { checkStructure } = require(path.join(__dirname, '..', '..', 'scripts', 'lib', 'report-writer.js'));

function fakeGet(state) {
  return async (url) => {
    state.calls.push(url);
    if (url.includes('reddit.com')) {return { status: 403, json: null };}
    if (url.endsWith('/commits?per_page=30')) {
      return { status: 200, json: state.commits.map((c) => ({ sha: c[0], html_url: `https://github.com/x/commit/${c[0]}`, commit: { message: c[1] } })) };
    }
    if (url.includes('/releases')) {return { status: 200, json: [{ tag_name: state.tag, name: state.tag, html_url: 'https://github.com/x/releases' }] };}
    if (url.includes('/forks')) {return { status: 200, json: [] };}
    return { status: 404, json: null };
  };
}

test('first read seeds cursors only; the next read reports what is new since then', async () => {
  const st = { calls: [], commits: [['aaa', 'Add _TZE200_abcdefgh TS0601 thermostat'], ['bbb', 'chore: deps']], tag: 'v1' };
  const t0 = Date.parse('2026-10-26T06:00:00Z');
  let r = await W.run({ now: t0, get: fakeGet(st), only: ['zhc', 'tinytuya'], cursors: W.emptyCursors(), ledger: W.emptyLedger() });
  assert.strictEqual(r.added, 0);
  assert.strictEqual(r.cursors.sources.zhc.last, 'aaa');
  st.commits = [['ccc', 'feat: add Tuya _TZ3000_zzzzzzzz plug'], ['ddd', 'docs: typo'], ['aaa', 'old']];
  st.tag = 'v2';
  r = await W.run({ now: t0 + 3 * 864e5, get: fakeGet(st), only: ['zhc', 'tinytuya'], cursors: r.cursors, ledger: r.ledger });
  const refs = r.ledger.rows.map((x) => `${x.source}:${x.ref}`);
  assert.deepStrictEqual(refs, ['zhc:ccc', 'tinytuya:v2'], 'only relevant new commits, plus the new release');
  assert.ok(r.ledger.rows.every((x) => !('author' in x) && x.title.length <= 100));
});

test('low frequency: a source is not asked again before its interval', async () => {
  const st = { calls: [], commits: [['aaa', 'x']], tag: 'v1' };
  const t0 = Date.parse('2026-10-26T06:00:00Z');
  const r = await W.run({ now: t0, get: fakeGet(st), only: ['zhc'], cursors: W.emptyCursors(), ledger: W.emptyLedger() });
  st.calls.length = 0;
  const r2 = await W.run({ now: t0 + 3600e3, get: fakeGet(st), only: ['zhc'], cursors: r.cursors, ledger: r.ledger });
  assert.strictEqual(st.calls.length, 0);
  assert.deepStrictEqual(r2.skipped, ['zhc']);
});

test('Reddit: first refusal stops every subreddit for the run and backs off 7 days', async () => {
  const st = { calls: [], commits: [], tag: 'v1' };
  const now = Date.parse('2026-10-26T06:00:00Z');
  const subs = W.SOURCES.filter((s) => s.kind === 'reddit').map((s) => s.id);
  const r = await W.run({ now, get: fakeGet(st), only: subs, cursors: W.emptyCursors(), ledger: W.emptyLedger() });
  assert.strictEqual(st.calls.filter((u) => u.includes('reddit')).length, 1);
  assert.ok(r.cursors.sources[subs[0]].backoffUntil);
  assert.ok(!W.due(W.SOURCES.find((s) => s.id === subs[0]), r.cursors.sources[subs[0]], now + 5 * 864e5, false));
});

test('ledger stays bounded and the weekly report has the report-writer shape', async () => {
  const ledger = W.emptyLedger();
  const now = Date.parse('2026-10-26T06:00:00Z');
  for (let i = 0; i < 1000; i++) {ledger.rows.push({ at: new Date(now).toISOString(), source: 'zhc', kind: 'commit', ref: `r${i}`, title: 'Tuya', url: 'https://github.com/x' });}
  const st = { calls: [], commits: [['aaa', 'x']], tag: 'v1' };
  const r = await W.run({ now, get: fakeGet(st), only: ['zhc'], cursors: W.emptyCursors(), ledger });
  assert.ok(r.ledger.rows.length <= W.MAX_ROWS);
  const md = W.weeklyReport(r.ledger, r.cursors, now).toMarkdown();
  assert.deepStrictEqual(checkStructure(md), []);
});
