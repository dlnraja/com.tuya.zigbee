'use strict';

/**
 * DaylightAtmosphere — community SSOT for solar white / brightness curves.
 *
 * WHY (P215): Several clock-based curves drifted apart (AdaptiveLighting,
 * SmartBiorhythm, flow circadian). One pure compute module keeps Homey heap
 * light (no timers) and never uses commercial product names in logs/UI.
 *
 * Inputs: solar elevation (°), optional ambient lux (Room Balance bias).
 * Outputs: kelvin, bright 0..1, light_temperature 0..1 (Homey warm←cold).
 *
 * Track: MASTER_ONLY feature math; safe to call from BOTH if copied surgically.
 */

const ELEV_LUT = [
  { elev: -90, kelvin: 2000, bright: 0.10 },
  { elev: -6, kelvin: 2000, bright: 0.10 },
  { elev: 0, kelvin: 2700, bright: 0.30 },
  { elev: 18, kelvin: 4000, bright: 0.70 },
  { elev: 60, kelvin: 6500, bright: 1.00 },
  { elev: 90, kelvin: 6500, bright: 1.00 },
];

const KELVIN_COLD = 6500;
const KELVIN_WARM = 2000;

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function lerpElev(elev, key) {
  for (let i = 1; i < ELEV_LUT.length; i++) {
    if (elev <= ELEV_LUT[i].elev) {
      const a = ELEV_LUT[i - 1];
      const b = ELEV_LUT[i];
      const t = (elev - a.elev) / (b.elev - a.elev || 1);
      return a[key] + t * (b[key] - a[key]);
    }
  }
  return ELEV_LUT[ELEV_LUT.length - 1][key];
}

/** Clock fallback when SolarElevation is unavailable. */
function fromClock(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  let kelvin;
  let bright;
  if (h < 5 || h >= 22) {
    kelvin = 2000;
    bright = 0.15;
  } else if (h < 8) {
    const t = (h - 5) / 3;
    kelvin = 2000 + t * 1500;
    bright = 0.15 + t * 0.35;
  } else if (h < 12) {
    const t = (h - 8) / 4;
    kelvin = 3500 + t * 3000;
    bright = 0.5 + t * 0.5;
  } else if (h < 17) {
    kelvin = 6500;
    bright = 1;
  } else if (h < 20) {
    const t = (h - 17) / 3;
    kelvin = 6500 - t * 2500;
    bright = 1 - t * 0.4;
  } else {
    const t = (h - 20) / 2;
    kelvin = 4000 - t * 2000;
    bright = 0.6 - t * 0.45;
  }
  return { kelvin: Math.round(kelvin), bright: clamp01(bright), elevation: null, source: 'clock' };
}

/**
 * Room Balance — lux soft-bias (ambient screen-balance idea, generic name).
 * High lux → slightly cooler / no need to blast brightness.
 * Low lux → warmer, slightly dimmer (evening feel earlier).
 * @param {{ kelvin: number, bright: number }} base
 * @param {number|null} lux
 */
function applyRoomBalance(base, lux) {
  if (typeof lux !== 'number' || !Number.isFinite(lux) || lux < 0) {
    return { ...base, luxBias: 0 };
  }
  // Typical indoor: <50 dark, 200–500 room, >1000 bright day near window
  let kelvinDelta = 0;
  let brightScale = 1;
  if (lux >= 800) {
    kelvinDelta = 400;
    brightScale = 0.92;
  } else if (lux >= 300) {
    kelvinDelta = 150;
    brightScale = 0.97;
  } else if (lux < 40) {
    kelvinDelta = -350;
    brightScale = 0.85;
  } else if (lux < 100) {
    kelvinDelta = -150;
    brightScale = 0.92;
  }
  const kelvin = Math.round(Math.max(KELVIN_WARM, Math.min(KELVIN_COLD, base.kelvin + kelvinDelta)));
  return {
    ...base,
    kelvin,
    bright: clamp01(base.bright * brightScale),
    luxBias: kelvinDelta,
  };
}

/**
 * @param {object} opts
 * @param {Date} [opts.date]
 * @param {number|null} [opts.elevation] solar elevation degrees
 * @param {object} [opts.solar] object with getElevation(date)
 * @param {number|null} [opts.lux] ambient lux for Room Balance
 * @returns {{ kelvin: number, bright: number, temperature: number, elevation: number|null, source: string, luxBias: number }}
 */
function compute(opts = {}) {
  const date = opts.date instanceof Date ? opts.date : new Date();
  let elev = typeof opts.elevation === 'number' && Number.isFinite(opts.elevation)
    ? opts.elevation
    : null;
  if (elev === null && opts.solar && typeof opts.solar.getElevation === 'function') {
    try {
      const e = opts.solar.getElevation(date);
      if (typeof e === 'number' && Number.isFinite(e)) {elev = e;}
    } catch { /* clock fallback */ }
  }

  let base;
  if (elev !== null) {
    base = {
      kelvin: Math.round(lerpElev(elev, 'kelvin')),
      bright: lerpElev(elev, 'bright'),
      elevation: elev,
      source: 'solar',
    };
  } else {
    base = fromClock(date);
  }

  const balanced = applyRoomBalance(base, opts.lux);
  // Homey light_temperature / light_color_temp: 0 = cold, 1 = warm
  const temperature = clamp01((KELVIN_COLD - balanced.kelvin) / (KELVIN_COLD - KELVIN_WARM));

  return {
    kelvin: balanced.kelvin,
    bright: Math.round(balanced.bright * 1000) / 1000,
    temperature: Math.round(temperature * 1000) / 1000,
    dim: Math.round(balanced.bright * 1000) / 1000,
    elevation: balanced.elevation,
    source: balanced.source,
    luxBias: balanced.luxBias || 0,
  };
}

/** Resolve lux from a motion/lux sensor device if present. */
function luxFromDevice(device) {
  if (!device || typeof device.getCapabilityValue !== 'function') {return null;}
  if (device.hasCapability?.('measure_luminance')) {
    const lux = device.getCapabilityValue('measure_luminance');
    return typeof lux === 'number' && Number.isFinite(lux) ? lux : null;
  }
  return null;
}

module.exports = {
  compute,
  applyRoomBalance,
  fromClock,
  luxFromDevice,
  ELEV_LUT,
  KELVIN_COLD,
  KELVIN_WARM,
};
