'use strict';

/**
 * P2705 — Tuya WiFi DP17 (`add_ele`) energy, auto-detected per device.
 *
 * WHY: make-all/tuya-local plug yaml declare DP17 as Wh (or kWh scale 1000) and as a
 * *measurement* (energy added since the previous report); Tuya Local bundles (Homey forum
 * 154077 #385/#419, Andi Wirz) use kwh_scale 0.001. Older code read it as a cumulative
 * counter /100. Some firmwares really do send a cumulative counter, so we detect per device.
 * HOW:  - incremental: kWh = raw/1000 added to a running total that STARTS from the device's
 *         existing meter_power (no paired plug's counter ever drops).
 *       - cumulative: legacy value (smartParse) kept, guarded so it can never go down
 *         (a device-side reset is absorbed into an offset).
 *       - auto: hold meter_power unchanged while collecting evidence (monotonicity / resets,
 *         and DP19 power × time vs the DP17 value or its delta), then decide and persist.
 * AGAINST: ×10 jumps, counters dropping after an update, invented energy.
 */

const MODES = ['auto', 'incremental', 'cumulative'];
const MIN_SAMPLES = 4;
const MAX_SAMPLES = 12;

function emptyState() {
  return {
    detected: null, // 'incremental' | 'cumulative' | null
    samples: [], // [{ raw, t, w }]
    baseline: null, // kWh meter value when the incremental path started
    incTotal: 0, // kWh accumulated by the incremental path
    lastEmitted: null, // last kWh written (monotonic guard)
    cumOffset: 0, // kWh absorbed from cumulative resets
    votes: { incremental: 0, cumulative: 0 },
  };
}

/** Energy (Wh) a load of avg(w0,w1) W draws over dtMs. null when power unknown. */
function expectedWh(w0, w1, dtMs) {
  const a = Number(w0); const b = Number(w1);
  if (!Number.isFinite(a) && !Number.isFinite(b)) return null;
  const avg = Number.isFinite(a) && Number.isFinite(b) ? (a + b) / 2 : (Number.isFinite(a) ? a : b);
  return (avg * dtMs) / 3600000;
}

function close(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const tol = Math.max(2, Math.max(Math.abs(x), Math.abs(y)) * 0.6);
  return Math.abs(x - y) <= tol;
}

/**
 * Vote on the newest sample pair.
 * - raw drops (not counter-sized) → incremental; long monotonic rise → cumulative.
 * - With power: raw ≈ expected Wh → incremental; (raw − prev) ≈ expected Wh (and raw ≫ expected) → cumulative.
 */
function vote(state) {
  const s = state.samples;
  if (s.length < 2) return;
  const p = s[s.length - 2]; const c = s[s.length - 1];
  if (c.raw < p.raw) state.votes.incremental += 2;
  const exp = expectedWh(p.w, c.w, c.t - p.t);
  if (exp != null && exp > 0.5) {
    const delta = c.raw - p.raw;
    const incOk = close(c.raw, exp);
    const cumOk = delta >= 0 && close(delta, exp) && c.raw > exp * 5;
    if (incOk && !cumOk) state.votes.incremental += 1;
    if (cumOk && !incOk) state.votes.cumulative += 1;
  }
}

function decide(state) {
  const s = state.samples;
  if (s.length < MIN_SAMPLES) return null;
  const { incremental, cumulative } = state.votes;
  if (incremental >= 2 && incremental > cumulative) return 'incremental';
  if (cumulative >= 2 && cumulative > incremental) return 'cumulative';
  if (s.length >= MAX_SAMPLES) {
    const monotonic = s.every((x, i) => i === 0 || x.raw >= s[i - 1].raw);
    const rose = s[s.length - 1].raw > s[0].raw;
    if (monotonic && rose) return 'cumulative';
    if (!monotonic) return 'incremental';
  }
  return null;
}

function guardMonotonic(state, kwh) {
  let v = kwh;
  if (state.lastEmitted != null && v < state.lastEmitted) v = state.lastEmitted;
  state.lastEmitted = v;
  return v;
}

/**
 * Feed one DP17 report.
 * @param {object} state - persisted state (mutated)
 * @param {object} input
 * @param {number} input.raw - DP17 raw value
 * @param {number} input.t - ms timestamp
 * @param {number|null} input.powerW - current DP19-derived power (W) if known
 * @param {number|null} input.currentMeter - device's current meter_power (kWh) — baseline
 * @param {number|null} input.legacyKwh - value the legacy path would write (smartParse)
 * @param {string} [input.override='auto']
 * @returns {{ kwh: number|null, mode: string|null, decidedNow: boolean }} kwh null = leave meter unchanged
 */
function feed(state, input) {
  const raw = Number(input.raw);
  if (!Number.isFinite(raw) || raw < 0) return { kwh: null, mode: state.detected, decidedNow: false };
  const override = MODES.includes(input.override) ? input.override : 'auto';
  const meter = Number.isFinite(Number(input.currentMeter)) ? Number(input.currentMeter) : 0;
  let decidedNow = false;

  let mode = override !== 'auto' ? override : state.detected;
  if (!mode) {
    state.samples.push({ raw, t: Number(input.t) || Date.now(), w: input.powerW == null ? null : Number(input.powerW) });
    if (state.samples.length > MAX_SAMPLES) state.samples.shift();
    vote(state);
    const d = decide(state);
    if (!d) return { kwh: null, mode: null, decidedNow: false };
    state.detected = d;
    mode = d;
    decidedNow = true;
  }

  if (mode === 'incremental') {
    if (state.baseline == null) {
      state.baseline = meter;
      state.incTotal = 0;
      state.lastEmitted = meter;
      // energy reported while we were still detecting is real energy — count it once
      if (decidedNow) {
        state.incTotal = state.samples.reduce((a, x) => a + x.raw / 1000, 0);
        state.samples = [];
        return { kwh: guardMonotonic(state, state.baseline + state.incTotal), mode, decidedNow };
      }
    }
    state.incTotal += raw / 1000;
    return { kwh: guardMonotonic(state, state.baseline + state.incTotal), mode, decidedNow };
  }

  // cumulative: legacy value, never allowed to go down
  const legacy = Number(input.legacyKwh);
  if (!Number.isFinite(legacy)) return { kwh: null, mode, decidedNow };
  if (state.lastEmitted == null) state.lastEmitted = meter;
  let v = legacy + state.cumOffset;
  if (v < state.lastEmitted) {
    // first cumulative value below the existing meter, or a device-side counter reset
    state.cumOffset += state.lastEmitted - v;
    v = state.lastEmitted;
  }
  if (decidedNow) state.samples = [];
  return { kwh: guardMonotonic(state, v), mode, decidedNow };
}

module.exports = { feed, emptyState, MODES, _internals: { vote, decide, expectedWh } };
