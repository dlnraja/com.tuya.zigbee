'use strict';

/**
 * P2791 / GH#550 — radar "direct mode" (per-device opt-in setting radar_direct_mode).
 * Raw DP reports map straight to capabilities; smoothing / inference / soft-clear writes are dropped
 * by the driver while it is on. Default off: no behaviour change for installed devices.
 */

// P2791: capabilities only raw DP reports may write while direct mode is on.
const RADAR_DIRECT_CAPS = new Set(['alarm_motion', 'alarm_human', 'measure_luminance', 'measure_luminance.distance']);

/** P2791: pure direct mapping. Returns {cap, value} or null (not a direct capability DP). */
function radarDirectValue(mapping, value, { invert = false, scale = 'auto' } = {}) {
  if (!mapping || !mapping.cap || !RADAR_DIRECT_CAPS.has(mapping.cap)) {return null;}
  if (mapping.cap === 'alarm_motion' || mapping.cap === 'alarm_human') {
    let p;
    if (typeof value === 'boolean') {p = value;}
    else if (mapping.enumMap && mapping.enumMap[value] !== undefined) {p = !!mapping.enumMap[value];}
    else {p = Number(value) > 0;}
    return { cap: 'alarm_motion', value: invert ? !p : p };
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {return null;}
  let v = n;
  // user override for distance units (radar_direct_distance_scale): dm → ÷10, cm → ÷100
  if (mapping.cap === 'measure_luminance.distance' && (scale === 'dm' || scale === 'cm')) {
    return { cap: mapping.cap, value: Math.round((n / (scale === 'dm' ? 10 : 100)) * 100) / 100 };
  }
  if (mapping.divisor) {v = n / mapping.divisor;}
  else if (mapping.preferDivisor) {
    v = n / mapping.preferDivisor;
    // dm preferred; a value beyond the profile range can only be cm
    if (mapping.maxMeters && v > mapping.maxMeters) {v = n / 100;}
  }
  return { cap: mapping.cap, value: Math.round(v * 100) / 100 };
}

module.exports = { RADAR_DIRECT_CAPS, radarDirectValue };
