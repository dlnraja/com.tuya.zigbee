'use strict';

/**
 * P2321 — Quiet mains availability poll heuristics (HomeSuite idea, MIT).
 * Pure helper — no Homey require.
 */

const QUIET_MAINS_MODEL_RE = /ZBMINIR2|MINI-ZBD|BASICZBR3|ZBMINI(?!L)/i;

function isQuietMainsAvailCandidate(deviceLike) {
  try {
    const caps = (typeof deviceLike.getCapabilities === 'function' && deviceLike.getCapabilities()) || [];
    if (caps.includes('measure_battery') || caps.includes('alarm_battery')) { return false; }
    const model = String(
      (typeof deviceLike.getSetting === 'function' && deviceLike.getSetting('zb_model_id'))
      || (typeof deviceLike.getData === 'function' && deviceLike.getData()?.productId)
      || deviceLike._zbModelId
      || '',
    );
    return QUIET_MAINS_MODEL_RE.test(model);
  } catch (_e) {
    return false;
  }
}

module.exports = {
  QUIET_MAINS_MODEL_RE,
  isQuietMainsAvailCandidate,
};
