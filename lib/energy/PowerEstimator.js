'use strict';

/**
 * P3170 / t759u: pure power-estimation helpers (no timers, no device state).
 *
 * Models (same vocabulary as PowerCalc for HA, re-implemented, see CREDITS.md):
 *  - linear: on => standby + (rated - standby) * dimFraction, off => standby
 *  - lut:    sorted [[dimFraction, watts], ...] interpolated; only for an exact
 *            mfr+pid couple with a recorded measured source (registry starts empty:
 *            no couple is ever invented).
 * Integration: left Riemann (power held since the previous sample), gaps capped so a
 * restart/sleep never books hours of phantom energy, result never decreases.
 *
 * Homey native energy (driver.compose energy.approximation usageOn/usageOff + the
 * user's "Power usage when on/off" settings, scaled by dim) stays the preferred path
 * for devices WITHOUT measure_power; this module only serves the optional app-side
 * estimate (enable_virtual_energy) already shipped on plug/switch bases.
 */

const MAX_GAP_MS = 15 * 60 * 1000;

// exact "mfr|pid" (lower-case) -> { lut, source }. Empty until a sourced profile exists.
const LUT_PROFILES = Object.freeze({});

function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }

function dimFraction(dim) {
  if (dim === null || dim === undefined) {return 1;}
  const d = num(dim, 1);
  return Math.min(1, Math.max(0, d));
}

function interpolate(lut, x) {
  if (!Array.isArray(lut) || lut.length === 0) {return null;}
  const pts = lut.filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
    .sort((a, b) => a[0] - b[0]);
  if (!pts.length) {return null;}
  if (x <= pts[0][0]) {return pts[0][1];}
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i];
      return x1 === x0 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
}

function lutFor(mfr, pid, profiles = LUT_PROFILES) {
  if (!mfr || !pid) {return null;}
  const p = profiles[`${String(mfr).toLowerCase()}|${String(pid).toLowerCase()}`];
  return p && Array.isArray(p.lut) ? p.lut : null;
}

/**
 * @returns {number} watts (>= 0)
 * P3412: optional gamma curve (default 1 = linear) + colorMode ('color' draws ~0.8x dual-white).
 */
function estimateWatts({ on, dim, ratedW, standbyW = 0, lut = null, gamma = 1, colorMode = null } = {}) {
  const standby = Math.max(0, num(standbyW, 0));
  if (!on) {return standby;}
  const f = dimFraction(dim);
  if (lut) {
    const w = interpolate(lut, f);
    if (w !== null) {return Math.max(0, w);}
  }
  const rated = Math.max(standby, num(ratedW, standby));
  const g = Math.max(0.5, Math.min(3.0, num(gamma, 1)));
  const curve = g === 1 ? f : Math.pow(f, g);
  const modeScale = colorMode === 'color' ? 0.8 : 1;
  return Math.round((standby + ((rated - standby) * curve * modeScale)) * 100) / 100;
}

/**
 * @returns {number} new cumulative kWh, >= prevKwh (left Riemann)
 */
function integrateKwh(prevKwh, prevWatts, dtMs, maxGapMs = MAX_GAP_MS) {
  const base = Math.max(0, num(prevKwh, 0));
  const w = Math.max(0, num(prevWatts, 0));
  const dt = Math.min(Math.max(0, num(dtMs, 0)), maxGapMs);
  return base + ((w * dt) / 3600000 / 1000);
}

/**
 * P3412: Trapezoidal kWh integration ((prevWatts + currWatts)/2 * dt),
 * halving integration error during ramps/dimming/heater cycles.
 */
function integrateKwhTrapezoidal(prevKwh, prevWatts, currWatts, dtMs, maxGapMs = MAX_GAP_MS) {
  const w0 = Math.max(0, num(prevWatts, 0));
  const w1 = Math.max(0, num(currWatts, w0));
  return integrateKwh(prevKwh, (w0 + w1) / 2, dtMs, maxGapMs);
}

/**
 * P3412: Fallback active power estimate from V * I * PF when a clamp/plug reports
 * voltage and current but omits or zeroes activePower.
 */
function estimatePowerFromVI(voltageV, currentA, powerFactor = 0.92) {
  const v = num(voltageV, NaN);
  const i = num(currentA, NaN);
  if (!Number.isFinite(v) || !Number.isFinite(i) || v < 50 || v > 450 || i < 0 || i > 200) {
    return null;
  }
  const pf = Math.max(0.1, Math.min(1, num(powerFactor, 0.92)));
  return Math.round(v * i * pf * 100) / 100;
}

module.exports = {
  estimateWatts,
  integrateKwh,
  integrateKwhTrapezoidal,
  estimatePowerFromVI,
  interpolate,
  lutFor,
  dimFraction,
  MAX_GAP_MS,
  LUT_PROFILES,
};
