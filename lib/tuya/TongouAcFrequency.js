'use strict';

/**
 * TongouAcFrequency — Homey port of Z2M herdsman #12993
 *
 * WHY(P2580): `_TZE284_6ocnqlhn` DP32 sometimes reports centihertz (4999→49.99)
 * and sometimes already-truncated Hz (49/50). Blind /100 turns 50 Hz into 0.5.
 *
 * Contre quoi: frequency graph spikes 4999↔49 and bogus 0.5 Hz.
 */

/**
 * @param {unknown} raw
 * @returns {number|null} Hz in sensible mains band, or null
 */
function normalizeTongouAcFrequency(raw) {
  let n = Number(raw);
  if (!Number.isFinite(n)) return null;
  // Centihertz (typical MCU): 4500–6500 → 45–65 Hz
  if (n >= 4000 && n <= 7000) return Math.round((n / 100) * 100) / 100;
  // Already Hz (truncated packet): 40–70
  if (n >= 40 && n <= 70) return Math.round(n * 100) / 100;
  // Tenths (499 = 49.9): rare
  if (n >= 400 && n <= 700) return Math.round((n / 10) * 100) / 100;
  // Fallback: if huge, assume centihertz
  if (n > 100) return Math.round((n / 100) * 100) / 100;
  return null;
}

module.exports = { normalizeTongouAcFrequency };
