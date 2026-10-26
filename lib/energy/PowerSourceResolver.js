'use strict';

/**
 * PowerSourceResolver — one precedence for "how many watts is this device using"
 * (P3067, user t577u/t580u). Pure functions, no timers.
 *
 *   measured  > calculated (V×I×PF, Σ phases) > user rated power > per-couple default
 *   > per-driver rule > per-class default (data/energy/default-power.json)
 *
 * Defaults are APPROXIMATIONS and are labelled so; a real meter always wins.
 */

const path = require('path');

let _table = null;
function table() {
  if (_table) {return _table;}
  try {
    // eslint-disable-next-line global-require
    _table = require(path.join(__dirname, '..', '..', 'data', 'energy', 'default-power.json'));
  } catch (_e) {
    _table = { classes: {}, driverRules: [], couples: {} };
  }
  return _table;
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const round = (v, d = 2) => Math.round(v * (10 ** d)) / (10 ** d);

/** Default (approximate) on/standby watts for a device identity; null watts = no estimate. */
function defaultFor({ manufacturerName = '', productId = '', driverId = '', deviceClass = '' } = {}) {
  const t = table();
  const key = `${String(manufacturerName).toLowerCase()}|${String(productId).toUpperCase()}`;
  const couple = t.couples?.[key];
  if (couple) {return { ...couple, source: 'couple' };}
  for (const rule of t.driverRules || []) {
    if (new RegExp(rule.match, 'i').test(String(driverId))) {return { ...rule, source: 'driver_default' };}
  }
  const cls = t.classes?.[deviceClass] || t.classes?.other;
  return cls ? { ...cls, source: 'class_default' } : { onW: null, standbyW: null, curve: 'none', source: 'none' };
}

/** P = V × I × PF (PF defaults to 1 for resistive / unknown). */
function powerFromVI(volts, amps, pf = 1) {
  if (!isNum(volts) || !isNum(amps) || volts <= 0 || amps < 0) {return null;}
  const p = isNum(pf) && pf > 0 && pf <= 1 ? pf : 1;
  return round(volts * amps * p, 2);
}

/** Σ per-phase powers; ignores missing phases, null when none is known. */
function sumPhases(phases) {
  const vals = (phases || []).filter(isNum);
  return vals.length ? round(vals.reduce((a, b) => a + b, 0), 2) : null;
}

/** Instant power from on-state, dim level and curve. */
function curvePower(def, { on, dim = 1, moving = false, heating = null } = {}) {
  if (!def || !isNum(def.onW)) {return null;}
  const standby = isNum(def.standbyW) ? def.standbyW : 0;
  if (!on) {return standby;}
  switch (def.curve) {
    case 'linear_dim': return round(standby + ((def.onW - standby) * Math.max(0, Math.min(1, isNum(dim) ? dim : 1))), 2);
    case 'moving_only': return moving ? def.onW : standby;
    case 'heating_only': return heating === false ? standby : def.onW;
    default: return def.onW;
  }
}

/**
 * Resolve the power and its source.
 * input: { measuredW, volts, amps, pf, phaseW[], userRatedW, identity, state:{on,dim,moving,heating} }
 */
function resolve(input = {}) {
  if (isNum(input.measuredW) && input.measuredW >= 0) {return { watts: round(input.measuredW), source: 'measured' };}
  const phases = sumPhases(input.phaseW);
  if (phases !== null) {return { watts: phases, source: 'calculated' };}
  const vi = powerFromVI(input.volts, input.amps, input.pf);
  if (vi !== null) {return { watts: vi, source: 'calculated' };}
  const def = defaultFor(input.identity || {});
  const state = input.state || {};
  if (isNum(input.userRatedW) && input.userRatedW > 0) {
    const w = curvePower({ ...def, onW: input.userRatedW }, state);
    return { watts: w, source: 'user' };
  }
  const w = curvePower(def, state);
  if (w === null) {return { watts: null, source: 'none' };}
  return { watts: w, source: def.source === 'couple' ? 'couple_default' : 'default', why: def.why };
}

/**
 * Integrate power to kWh between two samples (trapezoid). Gaps > maxGapMs are not
 * integrated (device offline / Homey restart) so no phantom energy is invented.
 */
function integrateKwh(prevKwh, prevW, nextW, dtMs, maxGapMs = 30 * 60 * 1000) {
  const base = isNum(prevKwh) && prevKwh >= 0 ? prevKwh : 0;
  if (!isNum(dtMs) || dtMs <= 0 || dtMs > maxGapMs || !isNum(prevW) || !isNum(nextW)) {return base;}
  const avgW = (Math.max(0, prevW) + Math.max(0, nextW)) / 2;
  return round(base + ((avgW * dtMs) / 3.6e9), 6);
}

/**
 * Keep a cumulative kWh counter monotonic across device counter resets/rollovers:
 * returns { total, offset } where total = raw + offset. A drop of the raw counter
 * adds the last raw value to the offset (reset to ~0 or a wrap at rolloverKwh).
 */
function monotonicCounter(raw, state = {}, rolloverKwh = null) {
  const offset = isNum(state.offset) ? state.offset : 0;
  const lastRaw = isNum(state.lastRaw) ? state.lastRaw : null;
  if (!isNum(raw) || raw < 0) {return { total: lastRaw === null ? null : round(lastRaw + offset, 4), offset, lastRaw };}
  let nextOffset = offset;
  if (lastRaw !== null && raw < lastRaw) {
    nextOffset += isNum(rolloverKwh) && rolloverKwh > lastRaw ? rolloverKwh : lastRaw;
  }
  return { total: round(raw + nextOffset, 4), offset: nextOffset, lastRaw: raw };
}

function _resetTableForTests() { _table = null; }

module.exports = {
  defaultFor, powerFromVI, sumPhases, curvePower, resolve, integrateKwh, monotonicCounter, _resetTableForTests,
};
