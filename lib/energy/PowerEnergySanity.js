'use strict';

/**
 * PowerEnergySanity — P3021c (forum topic 140352 post #2092, Lucas360).
 *
 * WHY: a plug showed ~54 W instantaneous power while its daily energy total
 * read ~54 kWh. EnergyJumpGuard (P116) only catches single-report jumps
 * > 500 kWh, so a steady ×10…×1000 unit error, or an energy DP that actually
 * carries the power value (DP mix-up), slipped through. This closes the
 * "ProductValueValidator divisor fix" TODO of docs/P87 generically:
 *
 *   Physics cross-check — energy added over Δt can never exceed
 *   P_max × Δt (with margin). measure_power samples give P_max and the
 *   integrated energy ∫P·dt, so every meter_power interval can be checked.
 *
 * Verdicts per interval (pure function classifyInterval):
 *   ok          → energy delta plausible vs observed power
 *   factor f    → delta / f (f ∈ 10, 100, 1000) fits the power evidence
 *                 → unit/divisor mix-up (Wh vs kWh, ÷10 vs ÷1000…)
 *   implausible → no decade fits → DP mix-up suspected
 * Extra cross-checks:
 *   - meter value repeatedly equal to the live power value while the
 *     "cumulative" counter goes down = the energy DP carries W
 *   - daily delta (kWh) ≈ typical power (W) = the #2092 signature
 *
 * Correction is per device, sticky and persisted in the device store, and
 * only after CONFIRM_VOTES consecutive consistent verdicts (no single-sample
 * reaction). Without power evidence nothing is changed (fail-open):
 *   factor mode    → meter_power / f
 *   integrate mode → meter_power = last plausible value + ∫P·dt
 * Everything is logged with a 🚩 flag so a diagnostic shows the decision.
 */

const STORE_KEY = 'p3021c_energy_sanity';
const CONFIRM_VOTES = 3;
const MIN_INTERVAL_S = 60;
const POWER_MARGIN = 1.5;          // P_max × 1.5
const POWER_FLOOR_W = 5;           // standby / reporting deadband
const ROUNDING_KWH = 0.01;         // typical 0.01 kWh energy resolution
const MAX_HOLD_S = 900;            // never extrapolate a power sample > 15 min
const MIN_COVERAGE = 0.5;          // power evidence must cover half the interval
const DECADES = [10, 100, 1000];
const DAY_WINDOW_S = 20 * 3600;
const MIRROR_TOL = 0.02;
const DAILY_MIRROR_TOL = 0.1;
const PERSIST_EVERY_MS = 10 * 60 * 1000;

/**
 * Pure classification of one meter_power interval.
 * @param {{dE:number, dt:number, maxPowerW:number, integratedKWh:number, coverage:number}} i
 *   dE kWh delta, dt seconds, coverage 0..1 share of dt backed by power samples
 * @returns {{verdict:'skip'|'ok'|'factor'|'implausible', factor?:number, bound?:number}}
 */
function classifyInterval({ dE, dt, maxPowerW, integratedKWh, coverage }) {
  if (!(dt >= MIN_INTERVAL_S) || !(dE > 0) || !isFinite(dE)) {return { verdict: 'skip' };}
  if (!(coverage >= MIN_COVERAGE) || typeof maxPowerW !== 'number' || maxPowerW < 0) {
    return { verdict: 'skip' }; // no power evidence → never judge
  }
  const bound = ((maxPowerW * POWER_MARGIN) + POWER_FLOOR_W) * dt / 3600 / 1000 + ROUNDING_KWH;
  if (dE <= bound) {return { verdict: 'ok', bound };}
  const ref = integratedKWh > 0.001 ? integratedKWh : 0;
  for (const f of DECADES) {
    const c = dE / f;
    if (c <= bound && (ref === 0 || Math.abs(c - ref) / ref <= 0.5)) {return { verdict: 'factor', factor: f, bound };}
  }
  return { verdict: 'implausible', bound };
}

/** #2092 signature: daily kWh delta numerically equals the typical W value. */
function isDailyMirror(dayDeltaKWh, typicalPowerW) {
  if (!(typicalPowerW >= 1) || !(dayDeltaKWh > 0)) {return false;}
  return Math.abs(dayDeltaKWh - typicalPowerW) / typicalPowerW <= DAILY_MIRROR_TOL;
}

function _now(opts) { return opts && typeof opts.now === 'number' ? opts.now : Date.now(); }

function _state(device) {
  if (device._powerEnergySanity) {return device._powerEnergySanity;}
  const st = {
    mode: 'none', factor: 1, reason: null, base: 0, est: 0,
    p: null,               // last power sample {w, t}
    win: { maxW: 0, intKWh: 0, covS: 0 }, // power evidence since last energy sample
    e: null,               // last RAW energy sample {v, t}
    vote: { key: null, n: 0 },
    mirror: 0, decreased: false,
    good: null,            // last value judged plausible (base for integrate mode)
    streakKWh: 0,          // ∫P·dt over the suspicious streak (added to that base)
    day: null,             // {t, v, sumWs, covS}
    persistedAt: 0,
  };
  try {
    const saved = typeof device.getStoreValue === 'function' ? device.getStoreValue(STORE_KEY) : null;
    if (saved && typeof saved === 'object' && (saved.mode === 'factor' || saved.mode === 'integrate')) {
      st.mode = saved.mode;
      st.factor = Number(saved.factor) || 1;
      st.reason = saved.reason || null;
      st.base = Number(saved.base) || 0;
      st.est = Number(saved.est) || 0;
    }
  } catch (_e) { /* store unavailable → fresh */ }
  device._powerEnergySanity = st;
  return st;
}

function _persist(device, st, force, now) {
  if (!force && now - st.persistedAt < PERSIST_EVERY_MS) {return;}
  st.persistedAt = now;
  try {
    const p = device.setStoreValue?.(STORE_KEY, {
      mode: st.mode, factor: st.factor, reason: st.reason, base: st.base, est: st.est, at: now,
    });
    if (p && typeof p.catch === 'function') {p.catch(() => {});}
  } catch (_e) { /* soft */ }
}

function _log(device, msg) { try { device.log?.(`[POWER-ENERGY] ${msg}`); } catch (_e) { /* soft */ } }

/**
 * Feed a measure_power sample (W). Never changes the power value.
 */
function observePower(device, watts, opts) {
  if (!device || typeof watts !== 'number' || !isFinite(watts) || watts < 0) {return watts;}
  const st = _state(device);
  const t = _now(opts);
  if (st.p) {
    const dt = Math.min(Math.max(0, (t - st.p.t) / 1000), MAX_HOLD_S);
    const kWh = st.p.w * dt / 3600 / 1000;
    st.win.intKWh += kWh;
    st.win.covS += dt;
    if (st.day) { st.day.sumWs += st.p.w * dt; st.day.covS += dt; }
    if (st.mode === 'integrate') {st.est += kWh; _persist(device, st, false, t);}
  }
  st.win.maxW = Math.max(st.win.maxW, watts);
  st.p = { w: watts, t };
  return watts;
}

/**
 * Cross-check the power reading itself with V × I when both are known.
 * WHY: if measure_power is the wrong one (e.g. ÷10 too low), "correcting"
 * energy would make things worse — then we must not judge at all.
 */
function powerLooksTrustworthy(device, watts) {
  try {
    if (typeof device.getCapabilityValue !== 'function') {return true;}
    const has = c => (typeof device.hasCapability !== 'function') || device.hasCapability(c);
    if (!has('measure_voltage') || !has('measure_current')) {return true;}
    const v = device.getCapabilityValue('measure_voltage');
    const i = device.getCapabilityValue('measure_current');
    if (typeof v !== 'number' || typeof i !== 'number') {return true;}
    const va = v * i;
    if (va < POWER_FLOOR_W || watts < 1) {return true;}
    const ratio = watts / va; // power factor ≤ 1, allow reporting skew
    return ratio >= 0.3 && ratio <= 1.5;
  } catch (_e) { return true; }
}

function _vote(st, key) {
  if (st.vote.key === key) {st.vote.n += 1;} else {st.vote = { key, n: 1 };}
  return st.vote.n >= CONFIRM_VOTES;
}

function _activate(device, st, mode, factor, reason, lastPlausible, t) {
  st.mode = mode;
  st.factor = factor;
  st.reason = reason;
  if (mode === 'integrate') { st.base = lastPlausible; st.est = 0; }
  _log(device, `🚩 ${reason} — confirmed on ${CONFIRM_VOTES} intervals; per-device correction `
    + (mode === 'factor' ? `meter_power ÷${factor}` : `meter_power = ${lastPlausible.toFixed(3)} kWh + ∫measure_power·dt`)
    + ' (sticky, stored). Please report this line with a diagnostic.');
  _persist(device, st, true, t);
}

/**
 * Check a meter_power value (kWh) against the power evidence.
 * @returns {number} value to set (possibly corrected)
 */
function checkEnergy(device, value, opts) {
  if (!device || typeof value !== 'number' || !isFinite(value) || value < 0) {return value;}
  const st = _state(device);
  const t = _now(opts);
  const out = () => {
    if (st.mode === 'factor') {return value / st.factor;}
    if (st.mode === 'integrate') {return Math.round((st.base + st.est) * 1000) / 1000;}
    return value;
  };
  if (st.mode !== 'none') { st.e = { v: value, t }; return out(); }

  const prev = st.e;
  if (st.good === null) {st.good = value;}
  // Cross-check A: "cumulative" counter equal to live power and going down
  if (prev && value < prev.v * 0.995) {st.decreased = true;}
  if (st.p && st.p.w >= 1 && Math.abs(value - st.p.w) / st.p.w <= MIRROR_TOL) {st.mirror += 1;}
  if (st.mirror >= CONFIRM_VOTES && st.decreased) {
    _activate(device, st, 'integrate', 1, 'meter_power mirrors measure_power (energy DP carries W)',
      0, t); // WHY: every previous "energy" value was a W number — restart the counter
    st.e = { v: value, t };
    return out();
  }

  // Cross-check B: physics bound per interval (only if the power reading itself is sane)
  if (prev && st.p && !powerLooksTrustworthy(device, st.p.w)) {
    st.vote = { key: null, n: 0 };
    st.win = { maxW: st.p.w, intKWh: 0, covS: 0 };
  } else if (prev) {
    const dt = (t - prev.t) / 1000;
    const r = classifyInterval({
      dE: value - prev.v, dt, maxPowerW: st.win.maxW,
      integratedKWh: st.win.intKWh, coverage: dt > 0 ? st.win.covS / dt : 0,
    });
    if (r.verdict === 'ok') { st.vote = { key: null, n: 0 }; st.good = value; st.streakKWh = 0; }
    if (r.verdict === 'factor' || r.verdict === 'implausible') {st.streakKWh += st.win.intKWh;}
    const goodBase = (st.good === null ? prev.v : st.good) + st.streakKWh;
    if (r.verdict === 'factor' && _vote(st, `f${r.factor}`)) {
      _activate(device, st, 'factor', r.factor,
        `energy grows ×${r.factor} faster than measure_power allows (unit/divisor mix-up)`, 0, t);
    } else if (r.verdict === 'implausible' && _vote(st, 'implausible')) {
      _activate(device, st, 'integrate', 1,
        'energy growth impossible for observed power at every decade (DP mix-up)', goodBase, t);
    }
    if (r.verdict !== 'skip') {st.win = { maxW: st.p ? st.p.w : 0, intKWh: 0, covS: 0 };}
  }

  // Cross-check C: daily delta (kWh) ≈ typical power (W) — #2092 signature
  if (!st.day) {st.day = { t, v: value, sumWs: 0, covS: 0 };} else if ((t - st.day.t) / 1000 >= DAY_WINDOW_S && st.mode === 'none') {
    const spanS = (t - st.day.t) / 1000;
    const avgW = st.day.covS >= spanS * MIN_COVERAGE ? st.day.sumWs / st.day.covS : 0;
    if (isDailyMirror(value - st.day.v, avgW)) {
      _log(device, `🚩 daily energy delta ${(value - st.day.v).toFixed(2)} kWh ≈ average power ${avgW.toFixed(1)} W — unit/DP mix-up suspected`);
      // Activate only when the per-interval physics check already disagrees too.
      if (st.vote.key === 'implausible' || (st.vote.key && st.vote.key.startsWith('f'))) {
        _activate(device, st, 'integrate', 1, 'daily kWh delta equals power W (#2092 signature)',
          (st.good === null ? st.day.v : st.good) + st.streakKWh, t);
      }
    }
    st.day = { t, v: value, sumWs: 0, covS: 0 };
  }

  st.e = { v: value, t };
  return out();
}

function getStatus(device) {
  const st = device && device._powerEnergySanity;
  return st ? { mode: st.mode, factor: st.factor, reason: st.reason } : { mode: 'none', factor: 1, reason: null };
}

/** Reset (tests / re-pair / user "reset energy"). Also clears the stored decision. */
function reset(device) {
  if (!device) {return;}
  delete device._powerEnergySanity;
  try { const p = device.unsetStoreValue?.(STORE_KEY); if (p && p.catch) {p.catch(() => {});} } catch (_e) { /* soft */ }
}

module.exports = {
  observePower, checkEnergy, classifyInterval, isDailyMirror, powerLooksTrustworthy, getStatus, reset,
  STORE_KEY, CONFIRM_VOTES,
};
