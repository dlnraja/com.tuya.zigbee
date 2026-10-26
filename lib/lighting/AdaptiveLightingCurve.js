'use strict';

/**
 * AdaptiveLightingCurve — pure math for the app-level adaptive lighting engine.
 *
 * WHY (P3067, inspiration: iGen 2026-10-26 article on sun-following white light):
 * colour temperature follows the local sun — warm at dawn/dusk, cool at midday —
 * inside a recommended 2000-5600 K envelope, then clamped to what the bulb can
 * physically render. No timers, no I/O: safe to unit-test and to share between
 * Zigbee ZCL, Tuya EF00 and Tuya Wi-Fi local lights (they all expose the Homey
 * capability light_temperature 0 = coldest .. 1 = warmest of the DRIVER range).
 */

const CURVE_WARM_K = 2000;
const CURVE_COOL_K = 5600;
const SAFE_RANGE_K = Object.freeze({ minK: 2700, maxK: 6500 });
// Default 0..1 span used by the light bases when converting light_temperature
// to mireds (UnifiedLightBase/_setColorTemperature: 153 + v * (500 - 153)).
const DEFAULT_DRIVER_MIRED = Object.freeze({ min: 153, max: 500 });
const BRIGHT_MIN = 0.35;
const BRIGHT_MAX = 1.0;

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
function smoothstep(t) { const c = clamp(t, 0, 1); return c * c * (3 - (2 * c)); }

/** 0 (night/horizon) .. 1 (high sun). -6° civil twilight → 0, 45° → 1. */
function daylightFactorFromElevation(elevation) {
  if (typeof elevation !== 'number' || !Number.isFinite(elevation)) {return null;}
  return smoothstep((elevation + 6) / 51);
}

/** Fixed schedule fallback when no geolocation: sunrise ~07:00, noon 13:00, sunset ~19:00. */
function daylightFactorFromClock(date) {
  const h = date.getHours() + (date.getMinutes() / 60);
  if (h <= 6 || h >= 21) {return 0;}
  const t = h < 13 ? (h - 6) / 7 : (21 - h) / 8;
  return smoothstep(t);
}

function daylightFactor({ date = new Date(), elevation = null } = {}) {
  const f = daylightFactorFromElevation(elevation);
  return f === null ? { factor: daylightFactorFromClock(date), source: 'clock' } : { factor: f, source: 'sun' };
}

function targetKelvin(factor) {
  return Math.round(CURVE_WARM_K + (clamp(factor, 0, 1) * (CURVE_COOL_K - CURVE_WARM_K)));
}

function targetBrightness(factor) {
  return Math.round((BRIGHT_MIN + (clamp(factor, 0, 1) * (BRIGHT_MAX - BRIGHT_MIN))) * 100) / 100;
}

/** Normalise a physical range from mireds (ZCL colorTempPhysicalMin/MaxMireds) or kelvin. */
function physicalRange({ minMired, maxMired, minK, maxK } = {}) {
  const okM = (m) => Number.isFinite(m) && m >= 50 && m <= 1000;
  if (okM(minMired) && okM(maxMired) && maxMired > minMired) {
    return { minK: Math.round(1e6 / maxMired), maxK: Math.round(1e6 / minMired), source: 'zcl' };
  }
  if (Number.isFinite(minK) && Number.isFinite(maxK) && maxK > minK && minK >= 1000 && maxK <= 20000) {
    return { minK, maxK, source: 'profile' };
  }
  return { ...SAFE_RANGE_K, source: 'default' };
}

/**
 * Convert a kelvin target to Homey light_temperature (0 cold .. 1 warm) of the
 * driver's own 0..1 mired span, after clamping to the physical range.
 */
function kelvinToHomeyTemperature(kelvin, phys = SAFE_RANGE_K, driverMired = DEFAULT_DRIVER_MIRED) {
  const k = clamp(kelvin, phys.minK, phys.maxK);
  const mired = 1e6 / k;
  const span = driverMired.max - driverMired.min;
  if (!(span > 0)) {return null;}
  return Math.round(clamp((mired - driverMired.min) / span, 0, 1) * 1000) / 1000;
}

/** RGB-only lights: white point approximation as Homey hue/saturation (0..1). */
function kelvinToHueSat(kelvin) {
  // Tanner Helland black-body approximation, enough for a warm/cool white tint.
  const t = clamp(kelvin, 1000, 40000) / 100;
  const r = t <= 66 ? 255 : clamp(329.698727446 * Math.pow(t - 60, -0.1332047592), 0, 255);
  const g = t <= 66 ? clamp((99.4708025861 * Math.log(t)) - 161.1195681661, 0, 255)
    : clamp(288.1221695283 * Math.pow(t - 60, -0.0755148492), 0, 255);
  let b = 255;
  if (t < 66) {b = t <= 19 ? 0 : clamp((138.5177312231 * Math.log(t - 10)) - 305.0447927307, 0, 255);}
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) {h = ((g - b) / d) % 6;} else if (max === g) {h = ((b - r) / d) + 2;} else {h = ((r - g) / d) + 4;}
    h /= 6; if (h < 0) {h += 1;}
  }
  return { hue: Math.round(h * 1000) / 1000, saturation: max ? Math.round((d / max) * 1000) / 1000 : 0 };
}

/** Smooth step toward a target: never move more than maxStep per tick. */
function stepToward(current, target, maxStep) {
  if (typeof current !== 'number' || !Number.isFinite(current)) {return target;}
  const diff = target - current;
  if (Math.abs(diff) <= maxStep) {return target;}
  return Math.round((current + (Math.sign(diff) * maxStep)) * 1000) / 1000;
}

module.exports = {
  CURVE_WARM_K, CURVE_COOL_K, SAFE_RANGE_K, DEFAULT_DRIVER_MIRED,
  daylightFactor, daylightFactorFromElevation, daylightFactorFromClock,
  targetKelvin, targetBrightness, physicalRange, kelvinToHomeyTemperature,
  kelvinToHueSat, stepToward,
};
