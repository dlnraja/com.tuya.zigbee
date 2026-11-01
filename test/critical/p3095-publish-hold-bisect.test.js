'use strict';
// P3095: AggregateError self-fix loop for held drivers (split, isolate, accept, 3 attempts, pending guard).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const B = require('../../.github/scripts/publish-hold-bisect');
const ROOT = path.resolve(__dirname, '../..');
const HELD = ['a', 'b', 'c', 'd', 'e'];
const st0 = () => ({ queue: [['a', 'b', 'c', 'd', 'e']], attempts: {}, isolated: [], pending: null });

describe('P3095 publish-hold bisect', () => {
  it('Test accepts the whole group and moves to the next queued group', () => {
    const s = { queue: [['a', 'b'], ['c', 'd', 'e']], attempts: {}, isolated: [] };
    const d = B.decide({ released: 'a,b', outcome: 'test', state: s, heldIds: HELD });
    assert.deepStrictEqual(d.accept, ['a', 'b']);
    assert.deepStrictEqual(d.next, ['c', 'd', 'e']);
    assert.strictEqual(d.state.pending, null);
  });
  it('AggregateError keeps the group held and splits it in half, first half next', () => {
    const d = B.decide({ released: 'a,b,c,d,e', outcome: 'AggregateError', state: st0(), heldIds: HELD });
    assert.deepStrictEqual(d.accept, []);
    assert.deepStrictEqual(d.state.queue, [['a', 'b', 'c'], ['d', 'e']]);
    assert.deepStrictEqual(d.next, ['a', 'b', 'c']);
  });
  it('a single id with AggregateError is isolated, kept held, loop goes on', () => {
    const s = { queue: [['c'], ['d', 'e']], attempts: {}, isolated: [] };
    const d = B.decide({ released: 'c', outcome: 'AggregateError', state: s, heldIds: HELD });
    assert.strictEqual(d.isolate, 'c');
    assert.deepStrictEqual(d.state.isolated, ['c']);
    assert.deepStrictEqual(d.next, ['d', 'e']);
  });
  it('max 3 attempts per signature', () => {
    let s = { queue: [['a', 'b']], attempts: { 'a,b': 3 }, isolated: [] };
    const d = B.decide({ released: 'a,b', outcome: 'AggregateError', state: s, heldIds: HELD });
    assert.match(d.note, /3 attempts/);
    assert.deepStrictEqual(d.next, []);
    s = { queue: [['a', 'b']], attempts: { 'a,b': 3 }, isolated: [] };
    assert.deepStrictEqual(B.resolveRelease({ input: '', state: s, heldIds: HELD }), []);
  });
  it('transient / unknown outcome changes nothing and does not count', () => {
    const d = B.decide({ released: 'a,b', outcome: 'socket hang up', state: { queue: [['a', 'b']], attempts: {} }, heldIds: HELD });
    assert.strictEqual(d.state.attempts['a,b'], 0);
    assert.deepStrictEqual(d.accept, []);
  });
  it('dispatch: never while pending (< 6 h) or while a run is active; marks pending', () => {
    const now = Date.parse('2026-11-01T10:00:00Z');
    const pend = { ...st0(), pending: { ids: ['a'], at: '2026-11-01T09:00:00Z' } };
    assert.strictEqual(B.dispatchDecision({ state: pend, heldIds: HELD, now }).dispatch, false);
    assert.strictEqual(B.dispatchDecision({ state: st0(), heldIds: HELD, activeRuns: 1, now }).dispatch, false);
    const d = B.dispatchDecision({ state: st0(), heldIds: HELD, now });
    assert.strictEqual(d.dispatch, true);
    assert.deepStrictEqual(d.state.pending.ids, HELD);
    const stale = { ...st0(), pending: { ids: ['a'], at: '2026-11-01T01:00:00Z' } };
    assert.strictEqual(B.dispatchDecision({ state: stale, heldIds: HELD, now }).dispatch, true);
  });
  it('repo wiring: state file in config/ (tracked), workflow with workflow_run + cron + concurrency, GITHUB_TOKEN only, bot-commit-guard', () => {
    const st = JSON.parse(fs.readFileSync(path.join(ROOT, B.F.state), 'utf8'));
    assert.ok(Array.isArray(st.queue) && typeof st.attempts === 'object');
    assert.ok(!B.F.state.startsWith('.github/state'));
    const w = fs.readFileSync(path.join(ROOT, '.github/workflows/publish-hold-bisect.yml'), 'utf8');
    for (const k of ['workflow_run:', 'schedule:', 'group: publish-hold-bisect', 'bot-commit-guard.sh', 'release_held']) assert.ok(w.includes(k), k);
    assert.ok(!/secrets\.(?!GITHUB_TOKEN)/.test(w), 'only GITHUB_TOKEN');
    const ap = fs.readFileSync(path.join(ROOT, '.github/workflows/auto-publish-on-push.yml'), 'utf8');
    assert.ok(ap.includes('name: p3095-outcome') && ap.includes('publish-hold-bisect.js resolve'));
  });
  it('P3106: a verdict run is applied once; hand-off wired (GITHUB_TOKEN runs never fire workflow_run)', () => {
    const st = B.markDone({ queue: [], attempts: {}, isolated: [], pending: null }, 41263658690);
    assert.strictEqual(B.alreadyDone(st, '41263658690'), true);
    assert.strictEqual(B.alreadyDone(st, '1'), false);
    let big = { doneRuns: [] }; for (let k = 0; k < 80; k++) B.markDone(big, k);
    assert.strictEqual(big.doneRuns.length, B.DONE_RUNS_MAX);
    const w = fs.readFileSync(path.join(ROOT, '.github/workflows/publish-hold-bisect.yml'), 'utf8');
    assert.ok(w.includes('verdict_run:') && w.includes('"$VRUN"'));
    const ap = fs.readFileSync(path.join(ROOT, '.github/workflows/auto-publish-on-push.yml'), 'utf8');
    assert.ok(/gh workflow run publish-hold-bisect\.yml --ref master -f verdict_run="\$GITHUB_RUN_ID"/.test(ap));
  });
  it('P3107: commit step stages each path on its own (a missing path must not drop the state commit)', () => {
    const w = fs.readFileSync(path.join(ROOT, '.github/workflows/publish-hold-bisect.yml'), 'utf8');
    assert.ok(!/git add config\/publish-hold-drivers\.json config\//.test(w), 'no multi-path git add');
    assert.ok(w.includes('if [ -e "$f" ]; then git add -- "$f"; fi'));
  });
});
