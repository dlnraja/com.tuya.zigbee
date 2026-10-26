'use strict';

/**
 * PowerSelfCalibration — learn a light/dimmer/plug's own power curve from the
 * moments it DOES report real power (P3067, user t581u/t582u).
 *
 * Idea credited to Home Assistant "powercalc" (LUT per brightness level) —
 * reimplemented here in our own, much smaller form: a FIXED 10-bucket table
 * (dim 0–10 %, …, 90–100 %) of EMA watts + one standby EMA learned from OFF
 * reports. Constant memory per device (11 numbers + 11 counters), persisted
 * at most once a day as a tiny array, never a growing log.
 */

const BUCKETS = 10;
const ALPHA = 0.2;             // EMA weight of a new sample
const MIN_SAMPLES = 3;         // bucket trusted after 3 samples
const PERSIST_MS = 24 * 60 * 60 * 1000;
const MAX_W = 4000;            // ignore absurd samples (meter glitch)
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const r2 = (v) => Math.round(v * 100) / 100;

class PowerSelfCalibration {
  constructor(compact = null) {
    this.w = new Array(BUCKETS).fill(0);
    this.n = new Array(BUCKETS).fill(0);
    this.standby = 0;
    this.standbyN = 0;
    this.lastPersist = 0;
    this.dirty = false;
    if (Array.isArray(compact)) {this.load(compact);}
  }

  static bucket(dim) {
    const d = isNum(dim) ? Math.max(0, Math.min(1, dim)) : 1;
    return Math.min(BUCKETS - 1, Math.floor(d * BUCKETS));
  }

  /** Feed one real meter sample. */
  learn({ on, dim = 1, watts }) {
    if (!isNum(watts) || watts < 0 || watts > MAX_W) {return false;}
    if (on === false) {
      this.standby = this.standbyN ? r2(this.standby + (ALPHA * (watts - this.standby))) : r2(watts);
      this.standbyN = Math.min(this.standbyN + 1, 1000);
    } else if (on === true) {
      const b = PowerSelfCalibration.bucket(dim);
      this.w[b] = this.n[b] ? r2(this.w[b] + (ALPHA * (watts - this.w[b]))) : r2(watts);
      this.n[b] = Math.min(this.n[b] + 1, 1000);
    } else {return false;}
    this.dirty = true;
    return true;
  }

  /** Learned watts for a state, or null when not trusted yet (caller falls back). */
  estimate({ on, dim = 1 }) {
    if (on === false) {return this.standbyN >= MIN_SAMPLES ? this.standby : null;}
    const b = PowerSelfCalibration.bucket(dim);
    if (this.n[b] >= MIN_SAMPLES) {return this.w[b];}
    // linear interpolation between the nearest trusted buckets (powercalc "linear" idea)
    let lo = -1; let hi = -1;
    for (let i = b - 1; i >= 0; i--) { if (this.n[i] >= MIN_SAMPLES) { lo = i; break; } }
    for (let i = b + 1; i < BUCKETS; i++) { if (this.n[i] >= MIN_SAMPLES) { hi = i; break; } }
    if (lo >= 0 && hi >= 0) {return r2(this.w[lo] + (((this.w[hi] - this.w[lo]) * (b - lo)) / (hi - lo)));}
    return null;
  }

  /** Persist at most once a day; returns the compact array to store, or null. */
  persistIfDue(now) {
    if (!this.dirty || (this.lastPersist && now - this.lastPersist < PERSIST_MS)) {return null;}
    this.lastPersist = now;
    this.dirty = false;
    return this.toCompact();
  }

  toCompact() { return [1, this.standby, this.standbyN, ...this.w, ...this.n]; }

  load(a) {
    if (a[0] !== 1 || a.length !== 3 + (2 * BUCKETS)) {return;}
    this.standby = isNum(a[1]) ? a[1] : 0;
    this.standbyN = isNum(a[2]) ? a[2] : 0;
    for (let i = 0; i < BUCKETS; i++) {
      this.w[i] = isNum(a[3 + i]) ? a[3 + i] : 0;
      this.n[i] = isNum(a[3 + BUCKETS + i]) ? a[3 + BUCKETS + i] : 0;
    }
  }
}

/**
 * Bounded estimated-energy accumulator step: accrues only while available,
 * clamps gaps (restart/offline), and caps per-step drift to the physical max.
 */
function accrue(state, { watts, available = true, now, maxGapMs = 30 * 60 * 1000, maxW = MAX_W }) {
  const s = state || { kwh: 0, lastAt: null, lastW: null };
  if (!available || !isNum(watts)) { s.lastAt = null; s.lastW = null; return s; }
  const w = Math.max(0, Math.min(maxW, watts));
  if (isNum(s.lastAt) && isNum(s.lastW)) {
    const dt = now - s.lastAt;
    if (dt > 0 && dt <= maxGapMs) {s.kwh = Math.round((s.kwh + ((((s.lastW + w) / 2) * dt) / 3.6e9)) * 1e6) / 1e6;}
  }
  s.lastAt = now; s.lastW = w;
  return s;
}

PowerSelfCalibration.BUCKETS = BUCKETS;
PowerSelfCalibration.PERSIST_MS = PERSIST_MS;
PowerSelfCalibration.accrue = accrue;
module.exports = PowerSelfCalibration;
