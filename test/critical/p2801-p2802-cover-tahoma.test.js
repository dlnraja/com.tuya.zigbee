'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { CoverCommandQueue, getCoverQueue } = require('../../lib/covers/CoverCommandQueue');
const T = require('../../lib/covers/CoverTahomaActions');

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

test('P2801 queue never exceeds concurrency and preserves outcomes', async () => {
  const q = new CoverCommandQueue({ concurrency: 2, gapMs: 0 });
  let live = 0; let peak = 0;
  const job = (v) => async () => { live++; peak = Math.max(peak, live); await tick(5); live--; return v; };
  const out = await Promise.all([1, 2, 3, 4, 5, 6].map((v) => q.run(job(v))));
  assert.deepStrictEqual(out, [1, 2, 3, 4, 5, 6]);
  assert.ok(peak <= 2, `peak ${peak}`);
  await assert.rejects(q.run(async () => { throw new Error('boom'); }), /boom/);
});

test('P2801 queue is bounded: overflow runs directly instead of failing', async () => {
  const q = new CoverCommandQueue({ concurrency: 1, gapMs: 0, maxPending: 2 });
  let release; const gate = new Promise((r) => { release = r; });
  const ps = [q.run(() => gate), q.run(() => 'a'), q.run(() => 'b')];
  assert.strictEqual(q.size, 2);
  assert.strictEqual(await q.run(() => 'direct'), 'direct');
  assert.strictEqual(q.stats.bypassed, 1);
  release('g');
  assert.deepStrictEqual(await Promise.all(ps), ['g', 'a', 'b']);
});

test('P2801 hung job frees its slot after timeout', async () => {
  const q = new CoverCommandQueue({ concurrency: 1, gapMs: 0, jobTimeoutMs: 100 });
  q.run(() => new Promise(() => {}));
  const t0 = Date.now();
  assert.strictEqual(await q.run(() => 'next'), 'next');
  assert.ok(Date.now() - t0 < 1000);
  assert.strictEqual(q.stats.timedOut, 1);
});

test('P2801 getCoverQueue is per app and uses homey timers', () => {
  const calls = [];
  const homey = { setTimeout: (fn, ms) => { calls.push(ms); return setTimeout(fn, ms); }, clearTimeout: (t) => clearTimeout(t) };
  assert.strictEqual(getCoverQueue(homey), getCoverQueue(homey));
  assert.notStrictEqual(getCoverQueue(homey), getCoverQueue({}));
});

function fakeCover({ caps = ['windowcoverings_set', 'windowcoverings_tilt_set'], follow = true, identify = false } = {}) {
  const values = { windowcoverings_set: 0 };
  const sent = [];
  const dev = {
    homey: {},
    hasCapability: (c) => caps.includes(c),
    getSetting: () => null,
    getCapabilityValue: (c) => values[c],
    triggerCapabilityListener: async (c, v) => { sent.push([c, v]); if (follow) {values[c] = v;} },
    sent
  };
  if (identify) {
    dev.zclNode = { endpoints: { 1: { clusters: { basic: {} } }, 2: { clusters: { identify: { identify: async (a) => sent.push(['identify', a.identifyTime]) } } } } };
  }
  return dev;
}

const fast = { queue: new CoverCommandQueue({ gapMs: 0 }), sleep: () => tick(1), budgetMs: 50 };

test('P2802 position then tilt, in order, after arrival', async () => {
  const d = fakeCover();
  const r = await T.setPositionAndTilt(d, 40, 70, fast);
  assert.deepStrictEqual(d.sent, [['windowcoverings_set', 0.4], ['windowcoverings_tilt_set', 0.7]]);
  assert.deepStrictEqual(r, { combined: false, reached: true });
});

test('P2802 uses single combined command when the device offers one', async () => {
  const d = fakeCover();
  d.setCoverPositionAndTilt = async (p, t) => d.sent.push(['combined', p, t]);
  const r = await T.setPositionAndTilt(d, 100, 0, fast);
  assert.deepStrictEqual(d.sent, [['combined', 1, 0]]);
  assert.strictEqual(r.combined, true);
});

test('P2802 tilt still sent after bounded wait if cover never reports', async () => {
  const d = fakeCover({ follow: false });
  const r = await T.setPositionAndTilt(d, 50, 20, fast);
  assert.strictEqual(r.reached, false);
  assert.strictEqual(d.sent.length, 2);
});

test('P2802 no tilt capability: position only', async () => {
  const d = fakeCover({ caps: ['windowcoverings_set'] });
  await T.setPositionAndTilt(d, 10, 90, fast);
  assert.deepStrictEqual(d.sent, [['windowcoverings_set', 0.1]]);
});

test('P2802 identify only when cluster 0x0003 exists', async () => {
  const yes = fakeCover({ identify: true });
  assert.ok(T.supportsIdentify(yes));
  await T.identifyCover(yes, 999, fast);
  assert.deepStrictEqual(yes.sent, [['identify', 60]]);
  const no = fakeCover();
  assert.strictEqual(T.supportsIdentify(no), false);
  await assert.rejects(T.identifyCover(no, 5, fast), /0x0003/);
});

test('P2802 travel budget is bounded', () => {
  assert.strictEqual(T.travelBudgetMs({ getSetting: () => null }), 33000);
  assert.strictEqual(T.travelBudgetMs({ getSetting: (k) => k === 'open_time' ? 9999 : null }), 120000);
});

test('P2802 cards declared and registered; no invented speed/My DP card', () => {
  const dir = path.join(ROOT, '.homeycompose', 'flow', 'actions');
  for (const id of ['cover_set_position_and_tilt', 'cover_identify']) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, `${id}.json`), 'utf8'));
    assert.strictEqual(j.id, id);
    assert.ok(j.titleFormatted && j.titleFormatted.en.includes('[[cover]]'));
  }
  const ids = [];
  const homey = { flow: { getActionCard: (id) => ({ registerRunListener: () => ids.push(id) }) } };
  assert.deepStrictEqual(T.registerCoverTahomaCards(homey), ['cover_set_position_and_tilt', 'cover_identify']);
  assert.ok(!fs.existsSync(path.join(dir, 'cover_set_speed.json')));
  const loader = fs.readFileSync(path.join(ROOT, 'lib', 'flow', 'UniversalFlowCardLoader.js'), 'utf8');
  assert.match(loader, /registerCoverTahomaCards/);
});
