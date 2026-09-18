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

module.exports = {
  normalizeRadarRangeMeters,
  toRadarRangeTuyaValue,
};
