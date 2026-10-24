'use strict';

/**
 * P3021c — forum #2093 (blutch32, diag 3690dfdb, app v9.0.13, mfr `A89G12C`).
 *
 * The frame in that diag was `DP3=55 DP5=129 DP15=70 DP14=enum 1 DP9=enum 0`, i.e. the classic
 * Tuya soil layout. Three things went wrong after decode and are still reachable on current code:
 *
 *  1. DP5 temperature: the soil driver guessed the scale from magnitude (>100 → ÷10). 129 → 12.9 °C
 *     is right, but the same unit at 9.5 °C sends 95 and was shown as 95 °C. Once a device has
 *     proven ×10 scaling (|raw| > 100, physically impossible as soil °C) we keep ÷10 for good.
 *     `A89G12C` starts in ÷10 mode: Z2M tuya.ts ZS-SF00 (A89G12C|Arteco) maps DP5 with divideBy10,
 *     and the diag frame confirms ×10 on this manufacturer.
 *  2. DP14 is `battery_state` (enum low/middle/high) on these units (Z2M TS0601_soil, _soil_3) while
 *     DP15 carries the real %. The enum (1 → 50 %) overwrote DP15's 70 %. When DP15 has reported,
 *     DP14 must not drive measure_battery.
 *  3. DP9 is `temperature_unit` on every Z2M soil definition that exposes it; the generic auto-pattern
 *     mapped it to measure_temperature = 0 °C.
 *
 * Facts from Koenkk/zigbee-herdsman-converters src/devices/tuya.ts (TS0601_soil, TS0601_soil_3,
 * SGS02Z, HZ-SL10, ZS-SF00), rewritten — no code copied. Pure: no Homey access.
 */

const SCALE10_MFRS = Object.freeze(['a89g12c']);
const DP15_FRESH_MS = 36 * 3600 * 1000;

function _norm(m) { return String(m || '').trim().toLowerCase(); }

function newState(mfr, stored = {}) {
  return {
    scale10: stored.scale10 === true || SCALE10_MFRS.includes(_norm(mfr)),
    lastDp15At: Number.isFinite(stored.lastDp15At) ? stored.lastDp15At : 0,
  };
}

/**
 * Soil DP5 temperature. Returns { value, learned } where learned=true when this sample proved ×10.
 */
function scaleDp5(raw, state) {
  const n = Number(raw);
  if (!Number.isFinite(n)) {return { value: null, learned: false };}
  if (Math.abs(n) > 1000) {return { value: n / 100, learned: false };}
  if (Math.abs(n) > 100) {
    const learned = !state.scale10;
    state.scale10 = true;
    return { value: n / 10, learned };
  }
  return { value: state.scale10 ? n / 10 : n, learned: false };
}

/**
 * Pre-decode guard for DPs 9/14/15. Returns:
 *   { action: 'skip', reason } — do not map onto a capability (DP9 unit, DP14 when DP15 is live)
 *   null                       — keep the normal path
 */
function guardAux(dp, value, state, now = Date.now()) {
  const d = Number(dp);
  if (d === 15) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0 && n <= 100) {state.lastDp15At = now;}
    return null;
  }
  if (d === 14) {
    const n = Number(value);
    if (state.lastDp15At && now - state.lastDp15At < DP15_FRESH_MS && Number.isFinite(n) && n >= 0 && n <= 2) {
      return { action: 'skip', reason: 'dp14_battery_state_enum_while_dp15_percent_live' };
    }
    return null;
  }
  if (d === 9) {
    return { action: 'skip', reason: 'dp9_temperature_unit' };
  }
  return null;
}

module.exports = { SCALE10_MFRS, DP15_FRESH_MS, newState, scaleDp5, guardAux };
