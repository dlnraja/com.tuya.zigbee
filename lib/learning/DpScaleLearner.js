'use strict';

/**
 * DpScaleLearner — per-device memory of which scale (/1, /10, /100, /1000) the
 * SmartDivisor auto-convert path keeps choosing for each unmapped DP (P3073 §3).
 *
 * Why: SmartDivisor re-detects from scratch after every app restart, so a DP whose
 * first value after a restart is ambiguous (e.g. 0 or a borderline number) can flip
 * scale for a while. Once a device has shown the same scale >= 20 times with >= 90 %
 * agreement, we re-seed SmartDivisor's own cache with it at the next start, through
 * its existing rememberLearnedDivisor() (whose cache still rejects out-of-range values).
 *
 * Bounded by design: max 16 DP slots per device, fixed-size counters, persisted at
 * most once a day as a tiny array. Created lazily on the first report: nothing at
 * pairing, nothing sent to the device, never adds or removes a capability.
 * Master only until soak (config/architecture/sync-decisions.json).
 */

const DIVS = [1, 10, 100, 1000];
const MAX_SLOTS = 16;
const MIN_VOTES = 20;
const MIN_SHARE = 0.9;
const PERSIST_MS = 24 * 60 * 60 * 1000;
const COUNT_CAP = 100000;
const ALPHA = 0.2;
const STORE_KEY = 'p3073_dp_learn';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Nearest divisor (log scale) explaining raw -> value, or -1 when it cannot tell. */
function inferDivisor(raw, value) {
  if (!isNum(raw) || !isNum(value) || raw === 0 || value === 0) {return -1;}
  const ratio = Math.abs(raw / value);
  if (!(ratio > 0)) {return -1;}
  const l = Math.log10(ratio);
  let best = -1; let dist = Infinity;
  for (let i = 0; i < DIVS.length; i++) {
    const d = Math.abs(l - i);
    if (d < dist) { dist = d; best = i; }
  }
  return dist <= 0.35 ? best : -1;
}

class DpScaleLearner {
  constructor(compact = null) {
    this.slots = new Map();
    this.lastPersist = 0;
    this.dirty = false;
    if (Array.isArray(compact)) {this.load(compact);}
  }

  /** Feed one auto-converted report. Returns true when counted. */
  learn(dp, capability, raw, value, now = Date.now()) {
    const key = String(dp);
    let s = this.slots.get(key);
    if (!s) {
      if (this.slots.size >= MAX_SLOTS) {return false;}
      s = { dp: key, cap: String(capability || '').slice(0, 40), v: [0, 0, 0, 0], min: null, max: null, iv: 0, at: 0, n: 0 };
      this.slots.set(key, s);
    }
    if (isNum(raw)) {
      s.min = s.min === null ? raw : Math.min(s.min, raw);
      s.max = s.max === null ? raw : Math.max(s.max, raw);
    }
    if (s.at && now > s.at) {
      const gap = (now - s.at) / 1000;
      s.iv = s.iv ? Math.round(s.iv + (ALPHA * (gap - s.iv))) : Math.round(gap);
    }
    s.at = now;
    s.n = Math.min(s.n + 1, COUNT_CAP);
    const i = inferDivisor(raw, value);
    if (i >= 0) {
      s.v[i] = Math.min(s.v[i] + 1, COUNT_CAP);
      this.dirty = true;
      return true;
    }
    this.dirty = true;
    return false;
  }

  /** Confirmed divisor for a DP, or null (>= 20 votes and >= 90 % share). */
  confirmed(dp) {
    const s = this.slots.get(String(dp));
    if (!s) {return null;}
    const total = s.v.reduce((a, b) => a + b, 0);
    if (total < MIN_VOTES) {return null;}
    let bi = 0; for (let i = 1; i < 4; i++) {if (s.v[i] > s.v[bi]) {bi = i;}}
    return s.v[bi] / total >= MIN_SHARE ? DIVS[bi] : null;
  }

  /** Two scales both above 20 % share: worth a look (offline report only). */
  anomalies() {
    const out = [];
    for (const s of this.slots.values()) {
      const total = s.v.reduce((a, b) => a + b, 0);
      if (total < MIN_VOTES) {continue;}
      const strong = s.v.map((c, i) => c / total >= 0.2 ? DIVS[i] : 0).filter(Boolean);
      if (strong.length > 1) {out.push({ dp: s.dp, cap: s.cap, divisors: strong });}
    }
    return out;
  }

  /** Re-seed SmartDivisor with confirmed scales. remember(mfr, dp, cap, divisor) -> bool. */
  applyTo(manufacturerName, remember) {
    let n = 0;
    if (typeof remember !== 'function') {return 0;}
    for (const s of this.slots.values()) {
      const d = this.confirmed(s.dp);
      if (d && s.cap) {
        try { if (remember(manufacturerName || '', Number(s.dp), s.cap, d)) {n++;} } catch (_) { /* never break parsing */ }
      }
    }
    return n;
  }

  shouldPersist(now = Date.now()) {
    return this.dirty && (now - this.lastPersist >= PERSIST_MS);
  }

  markPersisted(now = Date.now()) { this.lastPersist = now; this.dirty = false; }

  toCompact() {
    return [...this.slots.values()].map((s) => [s.dp, s.cap, ...s.v, s.min, s.max, s.iv, s.n]);
  }

  load(compact) {
    for (const r of compact.slice(0, MAX_SLOTS)) {
      if (!Array.isArray(r) || r.length < 10) {continue;}
      const [dp, cap, a, b, c, d, min, max, iv, n] = r;
      const cnt = (x) => isNum(x) && x >= 0 ? Math.min(x, COUNT_CAP) : 0;
      this.slots.set(String(dp), { dp: String(dp), cap: String(cap || '').slice(0, 40), v: [cnt(a), cnt(b), cnt(c), cnt(d)],
        min: isNum(min) ? min : null, max: isNum(max) ? max : null, iv: cnt(iv), at: 0, n: cnt(n) });
    }
    return this;
  }
}

/**
 * Hook used by TuyaEF00Manager after SmartDivisor (auto-convert path only).
 * Lazy: the learner is created on the first report; one restore + re-seed per
 * process; store write at most once per 24 h. Never throws.
 */
function observe(owner, device, { dp, capability, raw, value, manufacturerName, now = Date.now() } = {}) {
  try {
    if (!owner || !device) {return;}
    let L = owner._p3073Learner;
    if (!L) {
      let saved = null;
      try { saved = typeof device.getStoreValue === 'function' ? device.getStoreValue(STORE_KEY) : null; } catch (_) { saved = null; }
      L = owner._p3073Learner = new DpScaleLearner(Array.isArray(saved) ? saved : null);
      L.lastPersist = now;
      try { L.applyTo(manufacturerName, require('../managers/SmartDivisorManager').rememberLearnedDivisor); } catch (_) { /* optional */ }
    }
    L.learn(dp, capability, raw, value, now);
    if (L.shouldPersist(now) && typeof device.setStoreValue === 'function') {
      L.markPersisted(now);
      Promise.resolve(device.setStoreValue(STORE_KEY, L.toCompact())).catch(() => {});
    }
  } catch (_) { /* learning is best effort */ }
}

module.exports = { DpScaleLearner, inferDivisor, observe, STORE_KEY, MAX_SLOTS, MIN_VOTES, MIN_SHARE, PERSIST_MS };
