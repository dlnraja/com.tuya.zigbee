'use strict';

/**
 * NightPathBias (P2566) — unbranded night dim bias (Xiaomi/Aqara night path feel).
 * When House Mode is night (or clock night), scale Path Light / welcome dim down.
 * Pure helper — no timers. MASTER_ONLY.
 */

function isNightMode(app, date = new Date()) {
  try {
    const mode = app?.homeModeManager?.mode;
    if (mode === 'night') return true;
    if (mode === 'day' || mode === 'evening') return false;
  } catch (_e) { /* */ }
  try {
    const solar = app?.solarElevation;
    if (solar && typeof solar.getElevation === 'function') {
      return Number(solar.getElevation(date)) < -3;
    }
  } catch (_e2) { /* */ }
  const h = date.getHours();
  return h >= 23 || h < 6;
}

/**
 * @param {number} dim 0..1
 * @param {object} app
 * @param {object} [opts] nightFactor default 0.35
 */
function applyNightBias(dim, app, opts = {}) {
  const d = Math.max(0.01, Math.min(1, Number(dim) || 0.5));
  if (!isNightMode(app, opts.date)) return d;
  const factor = Math.max(0.1, Math.min(0.8, Number(opts.nightFactor) || 0.35));
  return Math.round(d * factor * 1000) / 1000;
}

module.exports = {
  isNightMode,
  applyNightBias,
};
