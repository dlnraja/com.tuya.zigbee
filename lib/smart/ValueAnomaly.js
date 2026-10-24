'use strict';

/**
 * P3023: generic value-anomaly detection for reported measurements (per device, bounded).
 *
 * Flags (always, observation only):
 *   range  — outside the physical range of the capability family;
 *   rate   — physically implausible change speed (temperature > 15 °C/min, humidity > 40 %/min);
 *   scale  — the value is ≈ 10^k × the device's recent median (k = ±1..±3): the classic
 *            ×10 / ×100 / ×1000 divisor confusion (0.1 °C units, mA vs A, Wh vs kWh…);
 *   energy — cross-check: a meter_power step is ≈1000× what measure_power can explain.
 * Auto-correction (SoakFlags.anomalyCorrect, master soak) only when ALL hold:
 *   - the raw value is OUT of range and value / 10^k is IN range and close to the median;
 *   - the same k was seen ≥ CONFIRM consecutive times (one glitch never rescales a device);
 *   - the capability is not owned by the energy guards (measure_power / meter_power stay with
 *     EnergyJumpGuard / PowerEnergySanity: here they are flagged only, never rescaled).
 * A learned factor is persisted per device (store 'p3023_value_scale', ≤ 16 caps) and dropped
 * after CONFIRM in-range raw values that agree with history (firmware fixed / re-pair).
 * Ideas: Z2M `precision`/`calibration` + divisor auto-detect discussions, ZHA quirk divisors,
 * deCONZ sanity limits (rewritten; no code copied — see CREDITS).
 */

const SoakFlags = require('./SoakFlags');

const STORE_KEY = 'p3023_value_scale';
const MAX_CAPS = 16;
const HIST = 8;
const CONFIRM = 3;
const MIN_HISTORY = 4;

const RANGES = Object.freeze({
  measure_temperature: [-60, 150],
  measure_humidity: [0, 100],
  measure_pressure: [300, 1100],
  measure_luminance: [0, 200000],
  measure_co2: [0, 20000],
  measure_pm25: [0, 2000],
  measure_pm10: [0, 2000],
  measure_voltage: [0, 500],
  measure_current: [0, 120],
  measure_battery: [0, 100],
  measure_noise: [0, 160],
  measure_tvoc: [0, 60000],
  measure_power: [-30000, 30000],
  meter_power: [0, 1e8],
});
const RATE_PER_MIN = Object.freeze({ measure_temperature: 15, measure_humidity: 40 });
const NO_CORRECT = new Set(['measure_power', 'meter_power']);
const FACTORS = [1, 2, 3, -1, -2, -3];

function family(cap) { return String(cap || '').split('.')[0]; }

function _median(arr) {
  const s = arr.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function _inRange(fam, v) { const r = RANGES[fam]; return !r || (v >= r[0] && v <= r[1]); }

function _close(a, b) {
  if (a === b) { return true; }
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) / scale <= 0.35;
}

function _state(device) {
  if (!device._p3023anomaly) {
    let persisted = null;
    try { persisted = typeof device.getStoreValue === 'function' ? device.getStoreValue(STORE_KEY) : null; } catch (_e) { persisted = null; }
    device._p3023anomaly = { caps: new Map(), k: persisted && typeof persisted === 'object' ? Object.assign({}, persisted) : {}, stats: { flagged: 0, corrected: 0 } };
  }
  return device._p3023anomaly;
}

function _cap(st, cap) {
  let c = st.caps.get(cap);
  if (!c) {
    if (st.caps.size >= MAX_CAPS) { st.caps.delete(st.caps.keys().next().value); }
    c = { h: [], t: 0, v: null, vk: 0, vn: 0, x: 0, f: 0 };
    st.caps.set(cap, c);
  }
  return c;
}

function _persist(device, st) {
  try {
    const keys = Object.keys(st.k);
    if (keys.length > MAX_CAPS) { keys.slice(0, keys.length - MAX_CAPS).forEach((k) => { delete st.k[k]; }); }
    if (typeof device.setStoreValue === 'function' && !device._destroyed) { Promise.resolve(device.setStoreValue(STORE_KEY, st.k)).catch(() => {}); }
  } catch (_e) { /* soft */ }
}

/**
 * Inspect one value about to be published. Pure w.r.t. control: returns the value to use.
 * @returns {{value:number, flags:string[], corrected?:number}} corrected = applied exponent k
 */
function check(device, capability, value, now = Date.now(), opts = {}) {
  const res = { value, flags: [] };
  if (!device || typeof value !== 'number' || !Number.isFinite(value)) { return res; }
  const fam = family(capability);
  if (!RANGES[fam]) { return res; }
  try {
    const st = _state(device);
    const c = _cap(st, capability);
    const allowCorrect = opts.correct !== undefined ? !!opts.correct : SoakFlags.anomalyCorrect;
    let v = value;
    const active = Number(st.k[capability]) || 0;
    const med = c.h.length >= MIN_HISTORY ? _median(c.h) : null;

    // 1. an already-learned factor
    if (active) {
      const scaled = value / Math.pow(10, active);
      if (_inRange(fam, value) && med !== null && _close(value, med)) {
        c.x++; // raw agrees with history → the device may have been fixed
        if (c.x >= CONFIRM) { delete st.k[capability]; c.x = 0; _persist(device, st); }
      } else {
        c.x = 0;
        if (allowCorrect && !NO_CORRECT.has(fam)) { v = scaled; res.corrected = active; }
      }
    }

    // 2. range
    if (!_inRange(fam, v)) { res.flags.push('range'); }

    // 3. scale confusion vs history (only when no factor applied yet)
    if (!res.corrected && med !== null && Math.abs(med) > 1e-9 && !_close(v, med)) {
      let hit = 0;
      for (const k of FACTORS) {
        const s = v / Math.pow(10, k);
        if (_close(s, med) && _inRange(fam, s)) { hit = k; break; }
      }
      if (hit) {
        res.flags.push('scale');
        if (c.vk === hit) { c.vn++; } else { c.vk = hit; c.vn = 1; }
        if (allowCorrect && !NO_CORRECT.has(fam) && c.vn >= CONFIRM && !_inRange(fam, v)) {
          st.k[capability] = hit; _persist(device, st);
          v = v / Math.pow(10, hit); res.corrected = hit; c.vn = 0;
          try { if (device.log) { device.log(`[VALUE-ANOMALY] ${capability}: ×10^${hit} scale confirmed ${CONFIRM}× → corrected`); } } catch (_e) { /* soft */ }
        }
      } else { c.vk = 0; c.vn = 0; }
    } else if (!res.corrected) { c.vk = 0; c.vn = 0; }

    // 4. rate of change
    const lim = RATE_PER_MIN[fam];
    if (lim && c.v !== null && c.t && now > c.t) {
      const perMin = Math.abs(v - c.v) / ((now - c.t) / 60000);
      if (perMin > lim && Math.abs(v - c.v) > lim / 4) { res.flags.push('rate'); }
    }

    // 5. energy cross-check (flag only)
    if (fam === 'meter_power' && c.v !== null && c.t && now > c.t && typeof device.getCapabilityValue === 'function') {
      let p = null;
      try { p = device.getCapabilityValue('measure_power'); } catch (_e) { p = null; }
      if (typeof p === 'number' && p >= 0) {
        const dKwh = v - c.v;
        const expected = (Math.max(p, 1) * (now - c.t)) / 3.6e9; // W·ms → kWh
        if (dKwh > 0 && expected > 0 && dKwh / expected > 300 && dKwh / expected < 5000 && dKwh > 0.05) { res.flags.push('energy'); }
      }
    }

    // history only keeps plausible values (so a burst of bad ones cannot become "normal")
    if (!res.flags.includes('range') && !res.flags.includes('scale')) {
      c.h.push(v);
      if (c.h.length > HIST) { c.h.shift(); }
    }
    c.v = v; c.t = now;
    if (res.flags.length) { c.f++; st.stats.flagged++; }
    if (res.corrected) { st.stats.corrected++; }
    res.value = v;
    return res;
  } catch (_e) {
    return { value, flags: [] };
  }
}

/** Convenience for set paths: returns the (possibly corrected) value, never throws. */
function apply(device, capability, value, now = Date.now()) {
  try {
    if (typeof value !== 'number' || !RANGES[family(capability)]) { return value; }
    const B = (() => { try { return require('../memory/MemoryBudget'); } catch (_e) { return null; } })();
    if (B && B.heuristicsPaused()) { return value; }
    return check(device, capability, value, now).value;
  } catch (_e) { return value; }
}

function snapshot(device) {
  const st = device && device._p3023anomaly;
  if (!st) { return null; }
  const caps = {};
  for (const [k, c] of st.caps) { caps[k] = { n: c.h.length, flags: c.f, pending: c.vk ? `10^${c.vk}×${c.vn}` : null }; }
  return { factors: Object.assign({}, st.k), caps, stats: Object.assign({}, st.stats) };
}

function trim(device) {
  const st = device && device._p3023anomaly;
  if (!st) { return false; }
  for (const c of st.caps.values()) { if (c.h.length > MIN_HISTORY) { c.h.splice(0, c.h.length - MIN_HISTORY); } }
  return true;
}

function release(device) { try { if (device) { delete device._p3023anomaly; } } catch (_e) { /* soft */ } }

module.exports = { check, apply, snapshot, trim, release, RANGES, RATE_PER_MIN, NO_CORRECT, STORE_KEY, CONFIRM, MAX_CAPS };
