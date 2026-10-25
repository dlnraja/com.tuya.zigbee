'use strict';

// P3030: cover lessons from Adrian Rockall's Somfy TaHoma app (topic 35206), own implementation.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { CoverCommandQueue, isTransientError, coverKey } = require('../../lib/covers/CoverCommandQueue');
const M = require('../../lib/covers/CoverMotionTracker');
const FA = require('../../lib/covers/CoverFlowActions');

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/* ---------- queue: supersede / dedup / retry ---------- */

test('P3030 newer command for the same cover replaces the queued one; both callers get its result', async () => {
  const q = new CoverCommandQueue({ concurrency: 1, gapMs: 0 });
  let release; const gate = new Promise((r) => { release = r; });
  const sent = [];
  const busy = q.run(() => gate, { key: 'other' });
  const p1 = q.run(() => { sent.push('open'); return 'open'; }, { key: 'c1', sig: 'open' });
  const p2 = q.run(() => { sent.push('close'); return 'close'; }, { key: 'c1', sig: 'close' });
  assert.strictEqual(q.size, 1);
  assert.strictEqual(q.stats.superseded, 1);
  release('x');
  assert.deepStrictEqual(await Promise.all([busy, p1, p2]), ['x', 'close', 'close']);
  assert.deepStrictEqual(sent, ['close']);
});

test('P3030 identical command is merged while queued and just after it started', async () => {
  const q = new CoverCommandQueue({ concurrency: 1, gapMs: 0, dedupMs: 10000 });
  let n = 0;
  let release; const gate = new Promise((r) => { release = r; });
  const a = q.run(async () => { n++; await gate; return 'stop'; }, { key: 'c1', sig: 'stop' });
  const b = q.run(async () => { n++; return 'stop2'; }, { key: 'c1', sig: 'stop' });
  assert.strictEqual(q.stats.deduped, 1);
  release();
  assert.deepStrictEqual(await Promise.all([a, b]), ['stop', 'stop']);
  assert.strictEqual(n, 1);
});

test('P3030 calls without key keep the old behaviour (no merge, no retry)', async () => {
  const q = new CoverCommandQueue({ concurrency: 1, gapMs: 0 });
  const out = await Promise.all([q.run(() => 1), q.run(() => 2)]);
  assert.deepStrictEqual(out, [1, 2]);
  let calls = 0;
  await assert.rejects(q.run(() => { calls++; throw new Error('Timeout after 10000ms'); }), /Timeout/);
  assert.strictEqual(calls, 1);
  assert.strictEqual(q.stats.superseded + q.stats.deduped + q.stats.retried, 0);
});

test('P3030 one retry on a transient radio error only', async () => {
  const q = new CoverCommandQueue({ concurrency: 1, gapMs: 0, retryDelayMs: 1 });
  let calls = 0;
  const ok = await q.run(() => { calls++; if (calls === 1) {throw new Error('timeout after 10000ms');} return 'moved'; }, { key: 'c1', sig: 'open' });
  assert.strictEqual(ok, 'moved');
  assert.strictEqual(calls, 2);
  assert.strictEqual(q.stats.retried, 1);
  let bad = 0;
  await assert.rejects(q.run(() => { bad++; throw new Error('Invalid position'); }, { key: 'c2', sig: 'x' }), /Invalid/);
  assert.strictEqual(bad, 1);
  let always = 0;
  await assert.rejects(q.run(() => { always++; throw new Error('MAC_NO_ACK'); }, { key: 'c3', sig: 'y' }), /MAC_NO_ACK/);
  assert.strictEqual(always, 2, 'bounded: one retry, then the error');
});

test('P3030 isTransientError and coverKey', () => {
  assert.ok(isTransientError(new Error('Timeout after 10000ms')));
  assert.ok(isTransientError({ code: 'ETIMEDOUT' }));
  assert.ok(isTransientError('device not responding'));
  assert.ok(!isTransientError(new Error('Invalid capability')));
  assert.ok(!isTransientError(null));
  assert.strictEqual(coverKey({ getData: () => ({ id: 'abc' }) }), 'abc');
  assert.strictEqual(coverKey({}), null);
  assert.strictEqual(coverKey(null), null);
});

test('P3030 flow actions pass the cover key and command to the queue', async () => {
  const seen = [];
  const listeners = {};
  const driver = { homey: { flow: { getActionCard: (id) => ({ registerRunListener: (fn) => { listeners[id] = fn; } }) } } };
  FA.wireCoverActions(driver, { open: ['o'] });
  const { getCoverQueue } = require('../../lib/covers/CoverCommandQueue');
  const q = getCoverQueue(driver.homey);
  const orig = q.run.bind(q);
  q.run = (fn, opts) => { seen.push(opts); return orig(fn, opts); };
  const dev = { getData: () => ({ id: 'd1' }), hasCapability: () => true, triggerCapabilityListener: async () => {} };
  assert.strictEqual(await listeners.o({ device: dev }), true);
  assert.deepStrictEqual(seen[0], { key: 'd1', sig: 'open' });
});

/* ---------- motion tracker ---------- */

function fakeTimers() {
  let now = 0; let seq = 0; const jobs = new Map();
  return {
    now: () => now,
    setTimeout: (fn, ms) => { const id = ++seq; jobs.set(id, { at: now + ms, fn }); return id; },
    clearTimeout: (id) => { jobs.delete(id); },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        let next = null;
        for (const [id, j] of jobs) { if (j.at <= end && (!next || j.at < next[1].at)) {next = [id, j];} }
        if (!next) {break;}
        jobs.delete(next[0]); now = next[1].at; next[1].fn();
      }
      now = end;
    },
    get size() { return jobs.size; },
  };
}

function tracker(extra = {}) {
  const t = fakeTimers(); const done = []; const reads = [];
  const m = new M.CoverMotionTracker({ timers: t, now: t.now, onFinished: (i) => done.push(i), onFinalRead: () => reads.push(t.now()), ...extra });
  return { t, m, done, reads };
}

test('P3030 tracker: command then reports up to the target → reached, then one delayed re-read', () => {
  const { t, m, done, reads } = tracker();
  m.notePosition(0);
  m.noteCommand(0.5);
  assert.strictEqual(m.moving, true);
  m.notePosition(0.2); t.advance(1000); m.notePosition(0.49);
  assert.strictEqual(m.moving, false);
  assert.strictEqual(done.length, 1);
  assert.deepStrictEqual([done[0].success, done[0].reached, done[0].reason], [true, true, 'reached']);
  t.advance(16000);
  assert.strictEqual(reads.length, 1);
  assert.strictEqual(t.size, 0, 'no timers left');
});

test('P3030 tracker: stop command, device idle, settle and budget end a move exactly once', () => {
  let r = tracker();
  r.m.noteCommand('down'); r.m.noteCommand('idle');
  assert.strictEqual(r.done[0].reason, 'stopped');
  r = tracker();
  r.m.noteCommand('up'); r.m.noteState('idle'); r.m.noteState('idle');
  assert.strictEqual(r.done.length, 1);
  r = tracker();
  r.m.notePosition(1); r.m.noteCommand(0); r.m.notePosition(0.6); r.t.advance(5000);
  assert.deepStrictEqual([r.done[0].reason, r.done[0].reached, r.done[0].success], ['settled', false, true]);
  r = tracker({ budgetMs: 30000 });
  r.m.noteCommand('down'); r.t.advance(30000);
  assert.strictEqual(r.done[0].reason, 'budget');
  assert.strictEqual(r.done.length, 1);
});

test('P3030 tracker: rejected command → failed, no re-read; external move is tracked too', () => {
  let r = tracker();
  r.m.noteCommand(0.3); r.m.noteFailed(new Error('Invalid DP'));
  assert.deepStrictEqual([r.done[0].success, r.done[0].reason, r.done[0].error], [false, 'failed', 'Invalid DP']);
  r.t.advance(20000);
  assert.strictEqual(r.reads.length, 0);
  r = tracker();
  r.m.notePosition(0.5); // first report only records
  assert.strictEqual(r.m.moving, false);
  r.m.notePosition('0.8'); // remote/hand move, numeric string accepted
  assert.strictEqual(r.m.moving, true);
  r.t.advance(5000);
  assert.strictEqual(r.done[0].reason, 'settled');
  assert.strictEqual(r.done[0].position, 0.8);
});

test('P3030 tracker: destroy clears every timer; listener errors stay local', () => {
  const r = tracker({ onFinished: () => { throw new Error('flow down'); } });
  r.m.noteCommand(0.5); r.m.notePosition(0.1);
  r.m.destroy();
  assert.strictEqual(r.t.size, 0);
  const s = tracker({ onFinished: () => { throw new Error('flow down'); } });
  assert.doesNotThrow(() => { s.m.noteCommand('up'); s.m.noteCommand('idle'); });
});

test('P3030 Homey glue: trigger fires with device id state, run listener matches, condition reads the tracker', async () => {
  const fired = []; const cards = {};
  const mk = (id) => ({ id, trigger: async (tokens, state) => fired.push([tokens, state]), registerRunListener(fn) { this.fn = fn; } });
  const homey = { flow: { getTriggerCard: (id) => cards[id] = cards[id] || mk(id), getConditionCard: (id) => cards[id] = cards[id] || mk(id) } };
  assert.deepStrictEqual(M.registerCoverMotionCards(homey), ['cover_movement_finished', 'cover_is_moving']);
  const dev = { homey, getData: () => ({ id: 'cv1' }) };
  dev._coverMotion = M.trackerForDevice(dev, { settleMs: 500, finalReadMs: 0 });
  dev._coverMotion.noteCommand('down');
  assert.strictEqual(await cards.cover_is_moving.fn({ device: dev }), true);
  dev._coverMotion.noteCommand('idle');
  await tick();
  assert.strictEqual(fired.length, 1);
  assert.deepStrictEqual(fired[0][0], { success: true, reached: false, position: -1, reason: 'stopped' });
  assert.deepStrictEqual(fired[0][1], { deviceId: 'cv1' });
  assert.strictEqual(await cards.cover_movement_finished.fn({ device: dev }, fired[0][1]), true);
  assert.strictEqual(await cards.cover_movement_finished.fn({ device: { getData: () => ({ id: 'x' }) } }, fired[0][1]), false);
  assert.strictEqual(await cards.cover_is_moving.fn({ device: dev }), false);
  assert.strictEqual(M.isDeviceMoving({}), false);
  dev._coverMotion.destroy();
});

/* ---------- wiring ---------- */

test('P3030 cards are declared in compose and app.json, registered by the loader, cover base feeds the tracker', () => {
  const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  for (const [kind, id] of [['triggers', 'cover_movement_finished'], ['conditions', 'cover_is_moving']]) {
    const compose = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose/flow', kind, `${id}.json`), 'utf8'));
    const built = app.flow[kind].find((c) => c.id === id);
    assert.deepStrictEqual(built, compose, `${id} in app.json matches compose`);
  }
  const trig = app.flow.triggers.find((c) => c.id === 'cover_movement_finished');
  assert.deepStrictEqual(trig.tokens.map((t) => t.name), ['success', 'reached', 'position', 'reason']);
  const loader = fs.readFileSync(path.join(ROOT, 'lib/flow/UniversalFlowCardLoader.js'), 'utf8');
  assert.ok(loader.includes('registerCoverMotionCards'));
  const base = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedCoverBase.js'), 'utf8');
  for (const s of ["_coverMotionTrack('command', value)", "_coverMotionTrack('command', state)", "_coverMotionTrack('failed', err)",
    "_coverMotionTrack('position', value)", "_coverMotionTrack('state', value)", '_coverFinalPositionRead']) {
    assert.ok(base.includes(s), s);
  }
  // never writes windowcoverings_state (P2393/P2399)
  const src = fs.readFileSync(path.join(ROOT, 'lib/covers/CoverMotionTracker.js'), 'utf8');
  assert.ok(!/setCapabilityValue/.test(src));
  assert.ok(fs.readFileSync(path.join(ROOT, 'CREDITS.md'), 'utf8').includes('Adrian Rockall'));
});
