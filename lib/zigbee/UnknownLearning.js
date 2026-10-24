'use strict';

/**
 * P3016: UnknownLearning. A bounded, persisted per-device memory that maps an unknown pattern
 * (cluster/cmd/payload pattern, or dp/type/value pattern) to the action that was inferred.
 *
 * - LRU of at most MAX_KEYS entries, kept in the store key 'unknown_learned'. Writes are
 *   throttled to one per DEBOUNCE_MS without timers; dispose() flushes.
 * - Reinforcement: each new sighting of the same pattern raises confidence (log2 of the count,
 *   capped at 0.99). An exact decoder always overwrites a heuristic entry.
 * - It holds no personal data: no IEEE, no names, no ids. Only patterns, actions and counters.
 * Never throws.
 */

const STORE_KEY = 'unknown_learned';
const MAX_KEYS = 40;
const DEBOUNCE_MS = 10000;

function _st(device) {
  if (!device._unknownLearn) { device._unknownLearn = { map: null, dirty: false, lastWrite: 0 }; }
  const st = device._unknownLearn;
  if (!st.map) {
    let m = null;
    try { m = typeof device.getStoreValue === 'function' ? device.getStoreValue(STORE_KEY) : null; } catch (_e) { m = null; }
    st.map = m && typeof m === 'object' && !Array.isArray(m) ? Object.assign({}, m) : {};
  }
  return st;
}

function _write(device, st, now) {
  st.dirty = false;
  st.lastWrite = now;
  try {
    if (device._destroyed || typeof device.setStoreValue !== 'function') { return; }
    Promise.resolve(device.setStoreValue(STORE_KEY, st.map)).catch(() => {});
  } catch (_e) { /* soft */ }
}

// Timer-free throttle: write at most once per DEBOUNCE_MS; dispose() flushes what is pending.
function _persist(device, st, now = Date.now()) {
  st.dirty = true;
  if (st.lastWrite && now - st.lastWrite < DEBOUNCE_MS) { return; }
  _write(device, st, now);
}

function _smart() {
  try {
    const F = require('../smart/SoakFlags');
    if (!F.bayesConfidence) { return null; }
    return { F, C: require('../smart/ConfidenceModel'), K: F.coupleKnowledge ? require('../smart/CoupleKnowledge') : null };
  } catch (_e) { return null; }
}

/**
 * P3023 (master soak): Bayesian confidence for a learned entry. Prior from its evidence tier
 * (exact / catalog / family / heuristic), updated by this device's confirms (e.p) and
 * contradictions (e.q), plus — at half weight, capped — the same exact couple's consensus.
 */
function _bayes(sm, e, shared) {
  let p = e.p || 0;
  let q = e.q || 0;
  if (shared) {
    const w = shared.a === e.a ? 1 : -1;
    const sp = Math.min(10, shared.p || 0) * 0.5;
    const sq = Math.min(10, shared.q || 0) * 0.5;
    if (w > 0) { p += sp; q += sq; } else { q += sp; p += sq; }
  }
  return sm.C.posterior(sm.C.tierOf({ exact: !!e.x, source: e.s }), p, q);
}

function reinforced(base, n) {
  return Math.min(0.99, Number(base || 0) + (0.05 * Math.log2(Math.max(1, n))));
}

/**
 * Record a sighting. Returns the effective interpretation: either the learned one, when it is
 * stronger than the fresh one, or the fresh one.
 * @param {object} device
 * @param {string} key pattern key (UnknownCommandInterpreter.framePattern/dpPattern)
 * @param {object} interp interpretation result
 */
function learn(device, key, interp, now = Date.now()) {
  if (!device || !key || !interp) { return interp; }
  try {
    const st = _st(device);
    const sm = _smart();
    let couple = null;
    let shared = null;
    if (sm && sm.K) {
      try { couple = sm.K.coupleOf(device); shared = couple ? sm.K.shared().attach(device.homey).pattern(couple, key) : null; } catch (_e) { couple = null; shared = null; }
    }
    let e = st.map[key];
    if (!e && shared && !interp.exact && shared.a !== interp.action) {
      // P3023: first sighting on this device, other devices of the exact couple agree on another
      // action strongly enough → use it as the prior (this device's own entry then takes over).
      const sc = sm.C.posterior('heuristic', Math.min(10, shared.p || 0), Math.min(10, shared.q || 0));
      if (sc >= 0.7 && sc > interp.confidence) { interp = Object.assign({}, interp, { action: shared.a, button: shared.b == null ? interp.button : shared.b, confidence: sc, source: 'couple' }); }
    }
    if (!e) {
      const keys = Object.keys(st.map);
      if (keys.length >= MAX_KEYS) {
        keys.sort((a, b) => (st.map[a].t || 0) - (st.map[b].t || 0));
        delete st.map[keys[0]];
      }
      e = { a: interp.action, b: interp.button, c: interp.confidence, x: interp.exact ? 1 : 0, s: String(interp.source || '').slice(0, 60), n: 0, f: now, t: now };
      st.map[key] = e;
    } else if (!e.u && ((interp.exact && !e.x) || interp.confidence > e.c)) {
      // better evidence replaces a weaker guess (never a user-taught entry)
      Object.assign(e, { a: interp.action, b: interp.button, c: interp.confidence, x: interp.exact ? 1 : 0, s: String(interp.source || '').slice(0, 60) });
    }
    if (sm && e.n > 0 && !e.u) { sm.C.observe(e, interp.action === e.a); }
    e.n++;
    e.t = now;
    _persist(device, st, now);
    const learnedConf = sm && !e.u ? _bayes(sm, e, shared) : reinforced(e.c, e.n);
    if (sm && couple && !e.k && !e.u && (e.p || 0) >= 3 && learnedConf >= 0.8) {
      e.k = 1; // share once per entry: repeated sightings on one device are not independent evidence
      try { sm.K.shared().notePattern(couple, key, e.a, e.b, true); } catch (_e) { /* soft */ }
    }
    // P3017: a user-taught mapping always wins; a learned guess wins only when stronger.
    if (e.u || (e.a !== interp.action && learnedConf >= interp.confidence)) {
      return Object.assign({}, interp, { action: e.a, button: e.b == null ? interp.button : e.b, confidence: learnedConf, source: `learned:${e.u ? 'user' : e.s}`, learned: true, seen: e.n });
    }
    return Object.assign({}, interp, { confidence: Math.max(interp.confidence, learnedConf), seen: e.n });
  } catch (_e) {
    return interp;
  }
}

/** Explicit teaching (Flow action unknown_command_teach, P3017): pins an action for a pattern. */
function teach(device, key, action, button = null, now = Date.now()) {
  if (!device || !key || !action) { return false; }
  try {
    const st = _st(device);
    const e = st.map[key] || { n: 0, f: now };
    Object.assign(e, { a: String(action), b: button == null ? null : Number(button), c: 0.9, x: 0, u: 1, s: 'user', t: now });
    st.map[key] = e;
    _write(device, st, now);
    // P3023: a user teach is the strongest evidence for the exact couple (prior for its siblings).
    const sm = _smart();
    if (sm && sm.K) { try { const c = sm.K.coupleOf(device); if (c) { sm.K.shared().attach(device.homey).notePattern(c, key, String(action), button, true); } } catch (_e) { /* soft */ } }
    return true;
  } catch (_e) { return false; }
}

/** P3017: remove one pattern (user mapping or learned guess). Returns true when something was removed. */
function forget(device, key, now = Date.now()) {
  if (!device || !key) { return false; }
  try {
    const st = _st(device);
    if (!st.map[key]) { return false; }
    delete st.map[key];
    _write(device, st, now);
    return true;
  } catch (_e) { return false; }
}

function lookup(device, key) {
  if (!device) { return null; }
  try { return _st(device).map[key] || null; } catch (_e) { return null; }
}

/** Diag-safe snapshot (patterns + actions + counters only). */
function snapshot(device, limit = MAX_KEYS) {
  if (!device) { return []; }
  try {
    const m = _st(device).map;
    return Object.keys(m)
      .sort((a, b) => (m[b].t || 0) - (m[a].t || 0))
      .slice(0, limit)
      .map((k) => ({ key: k, action: m[k].a, button: m[k].b, confidence: Number(reinforced(m[k].c, m[k].n).toFixed(2)), exact: !!m[k].x, user: !!m[k].u, seen: m[k].n, source: m[k].s }));
  } catch (_e) { return []; }
}

function dispose(device) {
  try {
    const st = device && device._unknownLearn;
    if (st && st.dirty && st.map) { st.dirty = false; Promise.resolve(device.setStoreValue && device.setStoreValue(STORE_KEY, st.map)).catch(() => {}); }
  } catch (_e) { /* soft */ }
}

module.exports = { learn, teach, forget, lookup, snapshot, dispose, reinforced, STORE_KEY, MAX_KEYS, DEBOUNCE_MS };
