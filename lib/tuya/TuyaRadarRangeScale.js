'use strict';

/**
 * TuyaRadarRangeScale — dual-scale range DPs (Z2M /100 vs ZHA ×0.1)
 *
 * WHY(P2583 / GH#547 gkfbdvyx + Z2M#27445 + ZHA quirk):
 * near/far detection DPs arrive as cm (÷100) OR decimeters (÷10). Blind /100
 * turns 60 dm (6 m) into 0.6 m; blind /10 turns 600 cm into 60 m.
 *
 * Contre quoi: settings TX/RX and inference use absurd ranges → "no function".
 */

const { asUnsignedTuyaValue } = require('./TuyaUnsignedValue');

/**
 * @param {unknown} raw
 * @param {{ maxMeters?: number }} [opts]
 * @returns {number|null} meters in (0, maxMeters]
 */
function normalizeRadarRangeMeters(raw, opts = {}) {
  const maxM = Number(opts.maxMeters) > 0 ? Number(opts.maxMeters) : 12;
  let n = asUnsignedTuyaValue(raw);
  if (n == null) {
    n = Number(raw);
  }
  if (!Number.isFinite(n) || n <= 0) return null;

  // Already meters (integer or float in band)
  if (n > 0 && n <= maxM) {
    return Math.round(n * 100) / 100;
  }

  // Centimeters / Z2M divideBy100: typically ≥100 (1.00 m+)
  if (n >= 100 && n <= maxM * 100) {
    return Math.round((n / 100) * 100) / 100;
  }

  // Decimeters / ZHA ×0.1: 1–120 for up to 12 m (when not already meters)
  if (n > maxM && n <= maxM * 10) {
    return Math.round((n / 10) * 100) / 100;
  }

  // Heuristic fallback
  const candidates = [n, n / 10, n / 100]
    .filter((v) => Number.isFinite(v) && v >= 0.3 && v <= maxM);
  if (candidates.length) {
    candidates.sort((a, b) => Math.abs(a - 4) - Math.abs(b - 4));
    return Math.round(candidates[0] * 100) / 100;
  }
  return null;
}

/**
 * Encode meters → preferred Tuya VALUE (cm / Z2M scale).
 * @param {number} meters
 * @param {{ maxMeters?: number }} [opts]
 * @returns {number|null}
 */
function toRadarRangeTuyaValue(meters, opts = {}) {
  const maxM = Number(opts.maxMeters) > 0 ? Number(opts.maxMeters) : 12;
  const m = Number(meters);
  if (!Number.isFinite(m) || m < 0) return null;
  const clamped = Math.min(maxM, Math.max(0, m));
  return Math.round(clamped * 100);
}

/**
 * WHY(P2715 / GH#550): target distance (DP9) — Z2M ÷10 (dm) preferred, but some
 * MCU frames arrive as cm (≥100). Blind ÷10 turns 300cm into 30m; blind ÷100
 * turns 30dm into 0.3m. Prefer dm when in (maxM, maxM*10], else cm / meters.
 *
 * @param {unknown} raw
 * @param {{ maxMeters?: number, preferDivisor?: number }} [opts]
 * @returns {number|null} meters
 */
function normalizeRadarTargetDistanceMeters(raw, opts = {}) {
  const maxM = Number(opts.maxMeters) > 0 ? Number(opts.maxMeters) : 12;
  const prefer = Number(opts.preferDivisor) > 0 ? Number(opts.preferDivisor) : 10;
  // Prefer float Number first — asUnsignedTuyaValue truncates 2.7 → 2
  const asFloat = Number(raw);
  if (Number.isFinite(asFloat) && asFloat >= 0 && asFloat <= maxM
    && (!Number.isInteger(asFloat) || asFloat === 0 || asFloat <= maxM)) {
    // Integer 1..maxM = already meters (Z2M sometimes reports whole meters)
    if (!Number.isInteger(asFloat) || asFloat <= maxM) {
      if (opts.scaleHint && typeof opts.scaleHint === 'object') {
        opts.scaleHint.last = 'm';
      }
      return Math.round(asFloat * 100) / 100;
    }
  }
  let n = asUnsignedTuyaValue(raw);
  if (n == null) n = asFloat;
  if (!Number.isFinite(n) || n < 0) return null;
  if (n === 0) return 0;

  // WHY(P2730 / GH#550): sticky scale — avoid dm↔cm flip mid-walk (UI dips then rises).
  const last = opts.scaleHint && typeof opts.scaleHint === 'object'
    ? opts.scaleHint.last : null;
  const setHint = (s) => {
    if (opts.scaleHint && typeof opts.scaleHint === 'object') opts.scaleHint.last = s;
  };

  // Already meters (integer in band) — handled above; keep for Buffer path
  if (n > 0 && n <= maxM) {
    setHint('m');
    return Math.round(n * 100) / 100;
  }

  // Ambiguous band (maxM, 100): prefer last sticky scale when set
  // WHY(P2744 / GH#550 HiepSVG @ 9.0.1250): sticky cm after one ≥100 frame poisoned
  // following dm frames (15–90) as ÷100 → UI jumped FARTHER when walking closer, then
  // corrected ~10s later. ZY-M100 preferDivisor=10 must stay dm in this band.
  if (n > maxM && n < 100) {
    if (prefer >= 100) {
      setHint('cm');
      return Math.round((n / 100) * 100) / 100;
    }
    if (prefer === 10) {
      setHint('dm');
      return Math.round((n / prefer) * 100) / 100;
    }
    if (last === 'cm' && n / 100 >= 0.3 && n / 100 <= maxM) {
      setHint('cm');
      return Math.round((n / 100) * 100) / 100;
    }
    setHint('dm');
    return Math.round((n / prefer) * 100) / 100;
  }

  // Centimeters (Z2M sibling / mis-scaled MCU): ≥100
  if (n >= 100 && n <= maxM * 100) {
    setHint('cm');
    return Math.round((n / 100) * 100) / 100;
  }

  // Decimeters (canonical ZY-M100-24GV3 ÷10)
  if (n > maxM && n <= maxM * 10) {
    setHint('dm');
    return Math.round((n / prefer) * 100) / 100;
  }

  const candidates = [n, n / 10, n / 100]
    .filter((v) => Number.isFinite(v) && v >= 0 && v <= maxM);
  if (candidates.length) {
    candidates.sort((a, b) => Math.abs(a - 2.5) - Math.abs(b - 2.5));
    return Math.round(candidates[0] * 100) / 100;
  }
  return null;
}

module.exports = {
  normalizeRadarRangeMeters,
  normalizeRadarTargetDistanceMeters,
  toRadarRangeTuyaValue,
};
