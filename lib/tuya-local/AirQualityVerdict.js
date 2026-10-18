'use strict';

/**
 * P2647 — WiFi AQI verdict helpers (com.tuyalocal Store Test inspiration).
 * Pure logic — safe for node:test without Homey Device class.
 */

function computeAirQualityLevel(co2, pm25) {
  const c = Number(co2);
  const p = Number(pm25);
  let score = 0;
  if (Number.isFinite(c)) {
    if (c >= 1500) score = Math.max(score, 2);
    else if (c >= 1000) score = Math.max(score, 1);
  }
  if (Number.isFinite(p)) {
    if (p >= 55) score = Math.max(score, 2);
    else if (p >= 35) score = Math.max(score, 1);
  }
  return score >= 2 ? 'poor' : score === 1 ? 'moderate' : 'good';
}

function crossedAbove(prev, next, threshold) {
  const t = Number(threshold);
  const a = Number(prev);
  const b = Number(next);
  if (!Number.isFinite(t) || !Number.isFinite(b)) return false;
  if (!Number.isFinite(a)) return b > t;
  return a <= t && b > t;
}

module.exports = {
  computeAirQualityLevel,
  crossedAbove,
};
