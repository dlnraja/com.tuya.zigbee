'use strict';
/** P3023: smarter, additive and bounded — confidence, couple knowledge, backoff, anomalies, chains. */
const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert');
const Flags = require('../../lib/smart/SoakFlags');
const AB = require('../../lib/smart/AdaptiveBackoff');
const CM = require('../../lib/smart/ConfidenceModel');
const CK = require('../../lib/smart/CoupleKnowledge');
const VA = require('../../lib/smart/ValueAnomaly');
const MC = require('../../lib/zigbee/MethodChain');
const UL = require('../../lib/zigbee/UnknownLearning');

function mkDev({ caps = [], mfr = '_TZ3000_abcdefgh', pid = 'TS0601', homey } = {}) {
  const store = {};
  const values = {};
  return {
    store, values, logs: [],
    homey: homey || { settings: { _m: {}, get(k) { return this._m[k]; }, set(k, v) { this._m[k] = v; } } },
    getStoreValue: (k) => store[k], setStoreValue: (k, v) => { store[k] = v; return Promise.resolve(); },
    getSetting: (k) => ({ zb_manufacturer_name: mfr, zb_model_id: pid })[k],
    hasCapability: (c) => caps.includes(c), getCapabilityValue: (c) => values[c],
    log(...a) { this.logs.push(a.join(' ')); },
  };
}

describe('P3023 SoakFlags', () => {
  it('is frozen and lists every behaviour switch', () => {
    assert.ok(Object.isFrozen(Flags));
    for (const k of ['adaptiveDedup', 'adaptiveBackoff', 'coupleKnowledge', 'bayesConfidence', 'anomalyCorrect', 'pacerPriority']) { assert.strictEqual(typeof Flags[k], 'boolean', k); }
  });
});

describe('P3023 AdaptiveBackoff', () => {
  it('reliable steps retry sooner, dead steps later, sleepy devices never get fast probes, all clamped', () => {
    const base = AB.delayMs(0);
    assert.strictEqual(base, AB.BASE_MS[0]);
    assert.ok(AB.delayMs(0, { s: 5, f: 1 }) < base);
    assert.ok(AB.delayMs(0, { s: 0, f: 5 }) > base);
    assert.ok(AB.delayMs(0, { s: 5, f: 0 }, { sleepy: true }) >= AB.SLEEPY_MIN_MS);
    assert.ok(AB.delayMs(4, { s: 0, f: 99 }, { sleepy: true, memFactor: 99 }) <= AB.MAX_MS);
    assert.ok(AB.delayMs(0, {}, { memFactor: 4 }) === base * 4);
    assert.strictEqual(AB.bump(AB.COUNT_CAP), AB.COUNT_CAP);
  });
  it('isSleepy reads battery caps / powerSource / receiveWhenIdle without throwing', () => {
    assert.strictEqual(AB.isSleepy(mkDev({ caps: ['measure_battery'] })), true);
    assert.strictEqual(AB.isSleepy(mkDev({ caps: ['onoff'] })), false);
    assert.strictEqual(AB.isSleepy({ zclNode: { node: { receiveWhenIdle: false } } }), true);
    assert.strictEqual(AB.isSleepy({ hasCapability() { throw new Error('x'); } }), false);
  });
});

describe('P3023 ConfidenceModel', () => {
  it('priors are ordered exact > user > catalog > family > heuristic and evidence moves them', () => {
    const t = ['exact', 'user', 'catalog', 'family', 'heuristic'].map((x) => CM.posterior(x));
    for (let i = 1; i < t.length; i++) { assert.ok(t[i - 1] > t[i]); }
    assert.ok(CM.posterior('heuristic', 10, 0) > 0.8);
    assert.ok(CM.posterior('catalog', 0, 30) < 0.3);
    assert.ok(CM.posterior('exact', 1e9, 0) <= 0.99);
    assert.strictEqual(CM.tierOf({ exact: true }), 'exact');
    assert.strictEqual(CM.tierOf({ source: 'catalog:z2m' }), 'catalog');
    const r = {}; for (let i = 0; i < 2000; i++) { CM.observe(r, true); }
    assert.strictEqual(r.p, CM.COUNT_CAP);
    assert.ok(CM.combine(0.5, 0.5) > 0.7 && CM.combine(0.5, 0.5) < 0.8);
  });
});

describe('P3023 CoupleKnowledge', () => {
  it('exact couple keys only; caps couples, chains, patterns and persisted bytes', () => {
    assert.strictEqual(CK.coupleKey('_TZ3000_AbC', 'ts0601'), '_tz3000_abc|TS0601');
    assert.strictEqual(CK.coupleOf(mkDev({ mfr: '_TZE200_X', pid: 'ts0601' })), '_tze200_x|TS0601');
    const settings = { _m: {}, get(k) { return this._m[k]; }, set(k, v) { this._m[k] = v; } };
    const k = new CK.CoupleKnowledge().attach({ settings });
    for (let i = 0; i < 400; i++) {
      const key = CK.coupleKey(`_tz3000_${i}`, 'TS0001');
      for (let j = 0; j < 40; j++) { k.noteChainWinner(key, `read.cap${j}`, 'tuya-dp'); k.notePattern(key, `pat${j}`, 'press', 1, true); }
    }
    const s = k.snapshot(1000);
    assert.ok(s.couples <= CK.MAX_COUPLES);
    for (const v of Object.values(s.sample)) { assert.ok(v.chain <= CK.MAX_CHAIN && v.patterns <= CK.MAX_PATTERNS); }
    assert.strictEqual(k.flush(), true);
    assert.ok(JSON.stringify(settings._m[CK.SETTINGS_KEY]).length <= CK.MAX_BYTES);
    assert.strictEqual(settings._m[CK.SETTINGS_KEY].v, CK.VERSION);
    const k2 = new CK.CoupleKnowledge().attach({ settings });
    const last = CK.coupleKey('_tz3000_399', 'TS0001');
    assert.strictEqual(k2.chainWinner(last, 'read.cap39'), 'tuya-dp');
    k2.trim();
    assert.ok(k2.snapshot().couples <= Math.ceil(CK.MAX_COUPLES / 2));
  });
  it('contradictions are counted and a better-supported action can replace the consensus', () => {
    const k = new CK.CoupleKnowledge();
    const key = CK.coupleKey('_tz3000_q', 'TS004F');
    k.notePattern(key, 'p', 'single', 1, true);
    k.notePattern(key, 'p', 'double', 1, true); // contradicts single
    assert.deepStrictEqual([k.pattern(key, 'p').a, k.pattern(key, 'p').q], ['single', 1]);
    k.notePattern(key, 'p', 'double', 1, true); // p(1) <= q(1) → replaced
    assert.strictEqual(k.pattern(key, 'p').a, 'double');
  });
});

describe('P3023 ValueAnomaly', () => {
  const feed = (d, cap, vals, opts = {}) => vals.map((v, i) => VA.check(d, cap, v, 1e6 + i * 600e3, opts));
  it('flags out-of-range values and never corrects energy (left to the energy guards)', () => {
    const d = mkDev();
    const r = feed(d, 'measure_humidity', [140]);
    assert.ok(r[0].flags.includes('range'));
    assert.strictEqual(r[0].value, 140);
    const e = feed(d, 'measure_power', [100, 101, 99, 100, 100000, 100000, 100000, 100000], { correct: true });
    assert.ok(e.every((x) => !x.corrected));
  });
  it('corrects a ×10 scale only after it is confirmed 3 times, and forgets it when the device is fixed', () => {
    const d = mkDev();
    feed(d, 'measure_temperature', [21, 21.2, 21.1, 21.3], { correct: true });
    const bad = feed(d, 'measure_temperature', [213, 212, 214], { correct: true });
    assert.strictEqual(bad[0].value, 213);
    assert.ok(bad[0].flags.includes('scale'));
    assert.strictEqual(bad[2].corrected, 1);
    assert.ok(Math.abs(bad[2].value - 21.4) < 1e-9);
    assert.strictEqual(d.store[VA.STORE_KEY].measure_temperature || (d.store[VA.STORE_KEY].k || {}).measure_temperature, 1);
    const next = feed(d, 'measure_temperature', [215], { correct: true });
    assert.ok(Math.abs(next[0].value - 21.5) < 1e-9);
    feed(d, 'measure_temperature', [21.4, 21.5, 21.3], { correct: true });
    assert.deepStrictEqual(VA.snapshot(d).factors, {});
  });
  it('observation-only mode (stable / bastien flags) never changes a value', () => {
    const d = mkDev();
    const all = feed(d, 'measure_temperature', [21, 21.2, 21.1, 21.3, 213, 212, 214, 215], { correct: false });
    assert.deepStrictEqual(all.map((x) => x.value), [21, 21.2, 21.1, 21.3, 213, 212, 214, 215]);
  });
  it('per-device state is bounded, trimmed and released; apply() never throws', () => {
    const d = mkDev();
    for (let c = 0; c < 50; c++) { for (let i = 0; i < 50; i++) { VA.check(d, `measure_temperature.s${c}`, 20 + (i % 3), 1e6 + i * 1000); } }
    assert.ok(d._p3023anomaly.caps.size <= VA.MAX_CAPS);
    for (const c of d._p3023anomaly.caps.values()) { assert.ok(c.h.length <= 8); }
    assert.strictEqual(VA.trim(d), true);
    VA.release(d);
    assert.strictEqual(d._p3023anomaly, undefined);
    assert.strictEqual(VA.apply(null, 'measure_temperature', 5), 5);
    assert.strictEqual(VA.apply(d, 'onoff', true), true);
  });
});

describe('P3023 MethodChain (memory factor, adaptive backoff, couple seeding)', () => {
  afterEach(() => { CK._resetShared(); require('../../lib/memory/MemoryBudget')._resetShared(); });
  const step = (name, fn) => ({ name, run: fn });
  const unsupported = async () => { throw Object.assign(new Error('UNSUPPORTED_ATTRIBUTE'), { status: 0x86 }); };

  it('working copy is cached per device (no deep clone per call) and trim() drops it only', async () => {
    const d = mkDev();
    await MC.runChain(d, 'read.t', [step('zcl-native', async () => 1)], { now: 0 });
    const a = d._methodChainSt;
    await MC.runChain(d, 'read.t', [step('zcl-native', async () => 1)], { now: 1 });
    assert.strictEqual(d._methodChainSt, a);
    assert.strictEqual(MC.trim(d), true);
    assert.strictEqual(d._methodChainSt, undefined);
    assert.strictEqual(MC.snapshot(d)['read.t'].winner, 'zcl-native');
  });

  it('sleepy devices back off ≥ 1 h after an unsupported answer when adaptive backoff soaks', async () => {
    const d = mkDev({ caps: ['measure_battery'] });
    await MC.runChain(d, 'read.b', [step('zcl-native', unsupported), step('tuya-dp', async () => 2)], { now: 0 });
    const n = d._methodChainSt['read.b'].d['zcl-native'].n;
    if (Flags.adaptiveBackoff) { assert.ok(n >= AB.SLEEPY_MIN_MS, String(n)); } else { assert.ok(n >= MC.BACKOFF_MS[0]); }
  });

  it('a winner learned on one device is tried first on a sibling of the SAME exact couple only', async () => {
    const homey = { settings: { _m: {}, get(k) { return this._m[k]; }, set(k, v) { this._m[k] = v; } } };
    const a = mkDev({ homey });
    const tried = [];
    const steps = () => [step('zcl-native', async () => { tried.push('zcl'); throw Object.assign(new Error('UNSUPPORTED_ATTRIBUTE'), { status: 0x86 }); }), step('tuya-dp', async () => { tried.push('dp'); return 3; })];
    await MC.runChain(a, 'read.x', steps(), { now: 0 });
    tried.length = 0;
    const b = mkDev({ homey });
    await MC.runChain(b, 'read.x', steps(), { now: 0 });
    if (Flags.coupleKnowledge) { assert.deepStrictEqual(tried, ['dp']); } else { assert.deepStrictEqual(tried, ['zcl', 'dp']); }
    tried.length = 0;
    const other = mkDev({ homey, mfr: '_TZ3000_zzzzzzzz' });
    await MC.runChain(other, 'read.x', steps(), { now: 0 });
    assert.deepStrictEqual(tried, ['zcl', 'dp']);
  });
});

describe('P3023 UnknownLearning (Bayesian confirm / contradict)', () => {
  afterEach(() => CK._resetShared());
  it('confirmations raise a heuristic, contradictions lower it; user teach stays authoritative', () => {
    const d = mkDev();
    const guess = { action: 'single', button: 1, confidence: 0.4, source: 'heuristic' };
    const first = UL.learn(d, 'k1', guess, 1);
    let last = first;
    for (let i = 0; i < 8; i++) { last = UL.learn(d, 'k1', guess, 2 + i); }
    assert.ok(last.confidence >= first.confidence);
    if (Flags.bayesConfidence) {
      const e = d._unknownLearn.map.k1;
      assert.ok(e.p >= 7, JSON.stringify(e));
      const before = last.confidence;
      for (let i = 0; i < 6; i++) { UL.learn(d, 'k1', Object.assign({}, guess, { action: 'double' }), 20 + i); }
      const after = UL.learn(d, 'k1', guess, 40);
      assert.ok(after.confidence < before || e.q > 0);
    }
    UL.teach(d, 'k2', 'long', 2, 50);
    assert.strictEqual(UL.lookup(d, 'k2').a, 'long');
  });
});
