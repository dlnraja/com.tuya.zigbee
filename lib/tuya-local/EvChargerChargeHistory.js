'use strict';

/**
 * EvChargerChargeHistory.js — P2642 complementary
 *
 * WHY: Phase-JSON "e"/"d" fields are ambiguous; completed charge records prove kWh.
 * HOW: Pure parse of history DP (often JSON {c,d,t,s,e}) → session kWh + duration.
 * WHO: wifi_ev_charger (MASTER_ONLY).
 * WHEN: DP update when settings.dp_charge_history fires.
 * AGAINST: Guessing session energy from live phase-JSON e/d (tuyalocal 1.0.237).
 *
 * Inspired by andiwirz/com.tuyalocal EV charger (MIT) — reimplemented.
 * Store: https://homey.app/fr-fr/app/com.tuyalocal/Tuya-Local/test/
 * Credits: docs/architecture/TUYALOCAL_COMPLEMENTARY_CREDITS.md
 *
 * Example: { "c": 121, "d": 9159, "t": "...", "s": ..., "e": ... }
 *   c = energy × history_energy_divisor (default 10 → 12.1 kWh)
 *   d = duration seconds (optional)
 */

/**
 * @param {*} value
 * @param {object} [opts]
 * @param {number} [opts.energyDivisor=10]
 * @returns {{ kwh: number, seconds: number|null, id: string }|null}
 */
function parseEvChargerChargeHistory(value, opts = {}) {
  let raw = value;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch (_e) { return null; }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const c = Number(raw.c);
  if (!Number.isFinite(c)) return null;

  const divisor = _pos(opts.energyDivisor, 10);
  const d = Number(raw.d);
  const id = String(raw.t ?? `${raw.s}-${raw.e}-${d}-${c}`);

  return {
    kwh: c / divisor,
    seconds: Number.isFinite(d) ? d : null,
    id,
  };
}

/** Heuristic: looks like a completed-charge history object (has numeric c). */
function looksLikeChargeHistory(value) {
  let raw = value;
  if (typeof raw === 'string') {
    if (!raw.trim().startsWith('{')) return false;
    try { raw = JSON.parse(raw); } catch (_e) { return false; }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  // Distinguish from phase JSON (L1/L2/L3 arrays)
  if (Array.isArray(raw.L1) || Array.isArray(raw.L2)) return false;
  return Number.isFinite(Number(raw.c));
}

/**
 * Dedup helper: return true if this history id was already applied.
 * Contre quoi: reconnect double-counting the same completed charge.
 */
function shouldApplyChargeHistory(rec, lastId) {
  if (!rec || !rec.id) return false;
  if (!(rec.kwh > 0) || rec.kwh > 200) return false;
  if (lastId != null && String(lastId) === String(rec.id)) return false;
  return true;
}

function _pos(n, fallback) {
  const x = Number(n);
  return Number.isFinite(x) && x !== 0 ? x : fallback;
}

/** OEM work_state vocabulary some chargers use instead of charger_* names. */
const OEM_WORK_STATE_MAP = Object.freeze({
  IDLE: 'plugged_out',
  SLEEP: 'plugged_out',
  IDLEINS: 'plugged_in',
  WORKING: 'plugged_in_charging',
  PAUSE: 'plugged_in_paused',
});

function mapEvChargerWorkState(raw) {
  if (raw == null) return null;
  const s = String(raw);
  if (OEM_WORK_STATE_MAP[s]) return OEM_WORK_STATE_MAP[s];
  // Standard Tuya names (passthrough hint for callers)
  const TUYA = {
    charger_free: 'plugged_out',
    charger_free_fault: 'plugged_out',
    charger_insert: 'plugged_in',
    charger_wait: 'plugged_in',
    charger_start_wait: 'plugged_in',
    charger_end: 'plugged_in',
    charger_fault: 'plugged_in',
    charger_charging: 'plugged_in_charging',
    charger_pause: 'plugged_in_paused',
    charger_stop_wait: 'plugged_in_paused',
  };
  return TUYA[s] || null;
}

module.exports = {
  parseEvChargerChargeHistory,
  looksLikeChargeHistory,
  shouldApplyChargeHistory,
  OEM_WORK_STATE_MAP,
  mapEvChargerWorkState,
};
