'use strict';

/**
 * EvChargerPhaseJson.js — P2641 complementary
 *
 * WHY: Some Tuya EV chargers (category qccdz) send all phase measurements
 *      as one JSON DP (often 102) instead of packed binary phase blocks.
 * HOW: Pure parse → Homey-ready voltage/current/power/temp (no device I/O).
 * WHO: wifi_ev_charger / WiFiDPRegistry enrich path (MASTER_ONLY WiFi).
 * WHEN: DP update when settings.dp_phase_json (or auto DP 102) fires.
 * AGAINST: Feeding JSON into packed-binary phase parsers → garbage tiles.
 *
 * Inspired by andiwirz/com.tuyalocal EV charger (MIT) — reimplemented;
 * credits: docs/architecture/TUYALOCAL_COMPLEMENTARY_CREDITS.md + SourceCredits.
 *
 * Example payload:
 *   {"L1":[2320,55,12],"L2":[2320,58,13],"L3":[2320,56,13],"t":370,"p":39,"e":113}
 * Tenths of V/A; power in 0.1 kW → ×100 = W. Do NOT invent lifetime from "d".
 */

/**
 * @param {*} value
 * @param {object} [opts]
 * @param {number} [opts.voltageDivisor=10]
 * @param {number} [opts.currentDivisor=10]
 * @param {number} [opts.powerFactor=100]  // tenths of kW → W
 * @param {number} [opts.tempDivisor=10]
 * @param {string} [opts.sessionField='none'] // 'e' | 'd' | 'none'
 * @param {number} [opts.energyDivisor=1000]
 * @returns {{
 *   phases: Record<string,{voltage:number,current:number,power:number}>,
 *   totalPowerW: number|null,
 *   temperatureC: number|null,
 *   sessionKwh: number|null,
 * }|null}
 */
function parseEvChargerPhaseJson(value, opts = {}) {
  let raw = value;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch (_e) { return null; }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const voltageDivisor = _pos(opts.voltageDivisor, 10);
  const currentDivisor = _pos(opts.currentDivisor, 10);
  const powerFactor = _pos(opts.powerFactor, 100);
  const tempDivisor = _pos(opts.tempDivisor, 10);
  const energyDivisor = _pos(opts.energyDivisor, 1000);
  const sessionField = String(opts.sessionField || 'none').toLowerCase();

  const phases = {};
  for (const name of ['L1', 'L2', 'L3']) {
    const v = raw[name];
    if (!Array.isArray(v) || v.length < 2) continue;
    const u = Number(v[0]);
    const i = Number(v[1]);
    const p = Number(v[2]);
    if (!Number.isFinite(u) || !Number.isFinite(i)) continue;
    phases[name] = {
      voltage: u / voltageDivisor,
      current: i / currentDivisor,
      power: Number.isFinite(p) ? p * powerFactor : 0,
    };
  }
  if (Object.keys(phases).length === 0) return null;

  const pRaw = _num(raw.p);
  const tRaw = _num(raw.t);
  let sessionKwh = null;
  if (sessionField === 'e' || sessionField === 'd') {
    const sRaw = _num(raw[sessionField]);
    if (sRaw != null) sessionKwh = sRaw / energyDivisor;
  }

  return {
    phases,
    totalPowerW: pRaw == null ? null : pRaw * powerFactor,
    temperatureC: tRaw == null ? null : tRaw / tempDivisor,
    sessionKwh,
  };
}

/** Heuristic: value looks like the L1/L2/L3 JSON block (not packed binary). */
function looksLikePhaseJson(value) {
  if (typeof value === 'string' && value.trim().startsWith('{') && /"L1"\s*:/.test(value)) {
    return true;
  }
  if (value && typeof value === 'object' && !Array.isArray(value) && !Buffer.isBuffer(value)) {
    return Array.isArray(value.L1) || Array.isArray(value.L2) || Array.isArray(value.L3);
  }
  return false;
}

function _pos(n, fallback) {
  const x = Number(n);
  return Number.isFinite(x) && x !== 0 ? x : fallback;
}

function _num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

module.exports = {
  parseEvChargerPhaseJson,
  looksLikePhaseJson,
};
