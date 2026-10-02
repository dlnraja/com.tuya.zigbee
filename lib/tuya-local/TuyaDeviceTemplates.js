'use strict';

/**
 * TuyaDeviceTemplates — pure, side-effect-free helpers that translate between
 * Homey capability values and the value conventions seen on Tuya Wi-Fi
 * (LAN protocol) devices. Written from behavioural notes only
 * (see docs/automation/localtuya-study.md); no third-party code included.
 *
 * Everything here is additive: drivers may use these helpers opportunistically
 * and fall back to their own mapping when a helper returns null.
 */

// ---------------------------------------------------------------- covers ----

/** Known command vocabularies for the "control" DP of curtains/blinds/shutters. */
const COVER_COMMAND_SETS = Object.freeze({
  open_close_stop: { open: 'open', close: 'close', stop: 'stop' },
  open_close_continue: { open: 'open', close: 'close', stop: 'continue' },
  on_off_stop: { open: 'on', close: 'off', stop: 'stop' },
  fz_zz_stop: { open: 'fz', close: 'zz', stop: 'stop' },
  zz_fz_stop: { open: 'zz', close: 'fz', stop: 'stop' },
  digits_123: { open: '1', close: '2', stop: '3' },
  digits_012: { open: '0', close: '2', stop: '1' },
});

/**
 * Guess the command set from a value a device reported. Ambiguous tokens
 * ('open', 'close', 'stop', 'fz', 'zz') return the most common set; only
 * unambiguous tokens switch to a less common vocabulary.
 */
function detectCoverCommandSet(value, current = null) {
  if (value === undefined || value === null) {return current;}
  const v = String(value).toLowerCase();
  if (v === 'continue') {return 'open_close_continue';}
  if (v === 'on' || v === 'off') {return 'on_off_stop';}
  if (v === 'fz' || v === 'zz') {
    return current === 'zz_fz_stop' ? 'zz_fz_stop' : 'fz_zz_stop';
  }
  if (v === '3') {return 'digits_123';}
  if (v === '0') {return 'digits_012';}
  if (v === 'open' || v === 'close') {
    return current === 'open_close_continue' ? current : 'open_close_stop';
  }
  return current;
}

/** Map a reported control value to Homey windowcoverings_state (up/down/idle). */
function coverStateFromValue(value, setName = 'open_close_stop') {
  const set = COVER_COMMAND_SETS[setName] || COVER_COMMAND_SETS.open_close_stop;
  const v = String(value).toLowerCase();
  if (v === set.open) {return 'up';}
  if (v === set.close) {return 'down';}
  return 'idle';
}

/** Map Homey windowcoverings_state to the device's vocabulary. */
function coverValueFromState(state, setName = 'open_close_stop') {
  const set = COVER_COMMAND_SETS[setName] || COVER_COMMAND_SETS.open_close_stop;
  if (state === 'up') {return set.open;}
  if (state === 'down') {return set.close;}
  return set.stop;
}

/** Device percent (0..100) -> Homey 0..1, optionally inverted. */
function coverPositionToHomey(percent, inverted = false) {
  const n = Number(percent);
  if (!Number.isFinite(n)) {return null;}
  const c = Math.max(0, Math.min(100, n));
  return (inverted ? 100 - c : c) / 100;
}

/** Homey 0..1 -> device percent integer, optionally inverted. */
function coverPositionToDevice(fraction, inverted = false) {
  const n = Number(fraction);
  if (!Number.isFinite(n)) {return null;}
  const p = Math.round(Math.max(0, Math.min(1, n)) * 100);
  return inverted ? 100 - p : p;
}

// --------------------------------------------------------------- climate ----

/** Common HVAC-mode vocabularies (Homey-ish mode -> device token). */
const CLIMATE_MODE_SETS = Object.freeze({
  auto_cold_hot: { auto: 'auto', cool: 'cold', heat: 'hot', heat_cool: 'heat', dry: 'wet', fan_only: 'wind' },
  manual_auto: { heat: 'manual', auto: 'auto' },
  manual_program: { heat: 'Manual', auto: 'Program' },
  cool_heat_fan: { cool: 'cool', heat: 'heat', fan_only: 'fan', dry: 'dry', auto: 'auto' },
});

/** Reverse-map a device token to a mode name using a set; null if unknown. */
function climateModeFromValue(value, setName = 'auto_cold_hot') {
  const set = CLIMATE_MODE_SETS[setName];
  if (!set) {return null;}
  for (const [mode, token] of Object.entries(set)) {
    if (String(token).toLowerCase() === String(value).toLowerCase()) {return mode;}
  }
  return null;
}

/** Map a mode name to the device token; null if the set has no such mode. */
function climateValueFromMode(mode, setName = 'auto_cold_hot') {
  const set = CLIMATE_MODE_SETS[setName];
  return set && Object.prototype.hasOwnProperty.call(set, mode) ? set[mode] : null;
}

/** Valve/relay "action" tokens -> heating/idle. */
function climateActionFromValue(value) {
  const v = String(value).toLowerCase();
  if (v === 'opened' || v === 'open' || v === 'heating' || v === 'true' || v === '1') {return 'heating';}
  if (v === 'closed' || v === 'close' || v === 'idle' || v === 'false' || v === '0') {return 'idle';}
  return null;
}

const ALLOWED_PRECISIONS = [0.01, 0.1, 0.5, 1];

/** Scale a raw integer temperature by a precision step (e.g. 215 * 0.1 = 21.5). */
function scaleTemperature(raw, precision = 1) {
  const n = Number(raw);
  if (!Number.isFinite(n)) {return null;}
  const p = ALLOWED_PRECISIONS.includes(precision) ? precision : 1;
  return Math.round(n * p * 100) / 100;
}

/** Inverse of scaleTemperature: degrees -> raw integer step count. */
function unscaleTemperature(degrees, precision = 1) {
  const n = Number(degrees);
  if (!Number.isFinite(n)) {return null;}
  const p = ALLOWED_PRECISIONS.includes(precision) ? precision : 1;
  return Math.round(n / p);
}

/**
 * Infer a precision from a raw value and a plausible range: a room
 * thermostat reporting 215 is almost certainly 21.5 °C.
 */
function guessTemperaturePrecision(raw, { min = -30, max = 100 } = {}) {
  const n = Number(raw);
  if (!Number.isFinite(n)) {return 1;}
  if (n >= min && n <= max) {return 1;}
  if (n / 10 >= min && n / 10 <= max) {return 0.1;}
  if (n / 100 >= min && n / 100 <= max) {return 0.01;}
  return 1;
}

// ----------------------------------------------------------------- light ----

function clamp01(x) { const n = Number(x); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0; }
function hex(n, width) { return Math.max(0, Math.round(n)).toString(16).padStart(width, '0').slice(-width); }

/** Detect colour string encoding: 'v2' = 12 hex chars HHHHSSSSVVVV, 'v1' = 14 hex chars RRGGBB + HHHHSSVV-ish. */
function detectColorFormat(value) {
  if (typeof value !== 'string') {return null;}
  const s = value.trim();
  if (!/^[0-9a-fA-F]+$/.test(s)) {return null;}
  if (s.length === 12) {return 'v2';}
  if (s.length === 14) {return 'v1';}
  return null;
}

function hsvToRgb(h, s, v) {
  const hh = ((h % 1) + 1) % 1 * 6;
  const i = Math.floor(hh);
  const f = hh - i;
  const p = v * (1 - s);
  const q = v * (1 - s * f);
  const t = v * (1 - s * (1 - f));
  const table = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]];
  const [r, g, b] = table[i % 6];
  return [r * 255, g * 255, b * 255];
}

/**
 * Decode a colour DP into { hue, saturation, value } in 0..1 ranges.
 * Returns null on anything unparseable.
 */
function decodeColor(value) {
  const fmt = detectColorFormat(value);
  if (fmt === 'v2') {
    const h = parseInt(value.slice(0, 4), 16);
    const s = parseInt(value.slice(4, 8), 16);
    const v = parseInt(value.slice(8, 12), 16);
    if (h > 360 || s > 1000 || v > 1000) {return null;}
    return { format: 'v2', hue: h / 360, saturation: s / 1000, value: v / 1000 };
  }
  if (fmt === 'v1') {
    // Trailing 8 chars carry hue (4 hex, degrees) + sat (2 hex) + val (2 hex), 0..255 scales.
    const h = parseInt(value.slice(6, 10), 16);
    const s = parseInt(value.slice(10, 12), 16);
    const v = parseInt(value.slice(12, 14), 16);
    if (h > 360) {return null;}
    return { format: 'v1', hue: h / 360, saturation: s / 255, value: v / 255 };
  }
  return null;
}

/** Encode { hue, saturation, value } (0..1) into the requested format. */
function encodeColor({ hue = 0, saturation = 1, value = 1 } = {}, format = 'v2') {
  const h = clamp01(hue); const s = clamp01(saturation); const v = clamp01(value);
  const deg = Math.round(h * 360) % 361;
  if (format === 'v1') {
    const [r, g, b] = hsvToRgb(h, s, v);
    return hex(r, 2) + hex(g, 2) + hex(b, 2) + hex(deg, 4) + hex(s * 255, 2) + hex(v * 255, 2);
  }
  return hex(deg, 4) + hex(s * 1000, 4) + hex(v * 1000, 4);
}

/** Brightness ranges seen in the field. */
const BRIGHTNESS_RANGES = Object.freeze({ v2: [10, 1000], v1: [25, 255] });

function brightnessToHomey(raw, [min, max] = BRIGHTNESS_RANGES.v2) {
  const n = Number(raw);
  if (!Number.isFinite(n) || max <= min) {return null;}
  return clamp01((n - min) / (max - min));
}

function brightnessToDevice(fraction, [min, max] = BRIGHTNESS_RANGES.v2) {
  return Math.round(min + clamp01(fraction) * (max - min));
}

/**
 * Colour temperature: Homey light_temperature is 0 (cold) .. 1 (warm).
 * Tuya raw 0..max is normally 0 = warm; `reversed` flips that.
 */
function colorTempToHomey(raw, max = 1000, reversed = false) {
  const n = Number(raw);
  if (!Number.isFinite(n) || max <= 0) {return null;}
  const f = clamp01(n / max);
  return reversed ? f : 1 - f;
}

function colorTempToDevice(fraction, max = 1000, reversed = false) {
  const f = clamp01(fraction);
  return Math.round((reversed ? f : 1 - f) * max);
}

/** Kelvin helpers (default 2700..6500 K). */
function rawToKelvin(raw, max = 1000, [kMin, kMax] = [2700, 6500]) {
  const n = Number(raw);
  if (!Number.isFinite(n) || max <= 0) {return null;}
  return Math.round(kMin + clamp01(n / max) * (kMax - kMin));
}

// ------------------------------------------------------------------- fan ----

/** Ordered list of speed tokens -> percentage (1-based, top speed = 100). */
function fanSpeedToPercent(value, speeds) {
  if (Array.isArray(speeds) && speeds.length) {
    const idx = speeds.map(String).indexOf(String(value));
    return idx < 0 ? null : Math.round(((idx + 1) / speeds.length) * 100);
  }
  if (speeds && typeof speeds === 'object' && Number.isFinite(speeds.min) && Number.isFinite(speeds.max) && speeds.max > speeds.min) {
    const n = Number(value);
    if (!Number.isFinite(n)) {return null;}
    return Math.round(((Math.max(speeds.min, Math.min(speeds.max, n)) - speeds.min + 1) / (speeds.max - speeds.min + 1)) * 100);
  }
  return null;
}

/** Percentage -> speed token (list) or integer (range). 0% returns null (= turn off). */
function percentToFanSpeed(percent, speeds) {
  const p = Number(percent);
  if (!Number.isFinite(p) || p <= 0) {return null;}
  const pc = Math.min(100, p);
  if (Array.isArray(speeds) && speeds.length) {
    const idx = Math.min(speeds.length, Math.max(1, Math.ceil((pc / 100) * speeds.length - 0.05))) - 1;
    return speeds[idx];
  }
  if (speeds && typeof speeds === 'object' && Number.isFinite(speeds.min) && Number.isFinite(speeds.max) && speeds.max > speeds.min) {
    const count = speeds.max - speeds.min + 1;
    return speeds.min + Math.min(count, Math.max(1, Math.ceil((pc / 100) * count - 0.05))) - 1;
  }
  return null;
}

const FAN_DIRECTIONS = Object.freeze({ forward: 'forward', reverse: 'reverse' });


// ---------------------------------------------------- legacy light schema ----

/**
 * Older bulbs expose switch/mode/brightness/temperature/colour on DPs 1..5
 * (brightness 25..255, temperature 0..255, colour in the 14-char encoding)
 * instead of DPs 20..24 (10..1000, 0..1000, 12-char encoding).
 * Returns 'legacy' / 'modern' / null (undecided) from a dps payload.
 */
function detectLightSchema(dps) {
  if (!dps || typeof dps !== 'object') {return null;}
  const has = (k) => Object.prototype.hasOwnProperty.call(dps, k) && dps[k] !== null && dps[k] !== undefined;
  if (has('20') || has('22') || has('24')) {return 'modern';}
  if (has('1') && typeof dps['1'] === 'boolean' && (has('2') || has('3') || has('5'))) {
    if (has('2') && typeof dps['2'] === 'string' && !['white', 'colour', 'color', 'scene', 'music'].includes(dps['2'])) {return null;}
    return 'legacy';
  }
  return null;
}

/** Translate a legacy (DP 1..5) payload into the modern DP 20..24 layout. Non-legacy keys pass through. */
function legacyLightToModern(dps) {
  const out = {};
  for (const [k, v] of Object.entries(dps || {})) {
    if (k === '1') {out['20'] = v;}
    else if (k === '2') {out['21'] = v === 'color' ? 'colour' : v;}
    else if (k === '3') {out['22'] = brightnessToDevice(brightnessToHomey(v, BRIGHTNESS_RANGES.v1), BRIGHTNESS_RANGES.v2);}
    else if (k === '4') {out['23'] = Math.round(Math.max(0, Math.min(255, Number(v) || 0)) / 255 * 1000);}
    else if (k === '5') {
      const c = decodeColor(v);
      out['24'] = c ? encodeColor(c, 'v2') : v;
    } else {out[k] = v;}
  }
  return out;
}

/** Inverse of legacyLightToModern for outgoing commands. */
function modernLightToLegacy(dps) {
  const out = {};
  for (const [k, v] of Object.entries(dps || {})) {
    if (k === '20') {out['1'] = v;}
    else if (k === '21') {out['2'] = v;}
    else if (k === '22') {out['3'] = brightnessToDevice(brightnessToHomey(v, BRIGHTNESS_RANGES.v2), BRIGHTNESS_RANGES.v1);}
    else if (k === '23') {out['4'] = Math.round(Math.max(0, Math.min(1000, Number(v) || 0)) / 1000 * 255);}
    else if (k === '24') {
      const c = decodeColor(v);
      out['5'] = c ? encodeColor(c, 'v1') : v;
    } else {out[k] = v;}
  }
  return out;
}

module.exports = {
  COVER_COMMAND_SETS,
  detectCoverCommandSet,
  coverStateFromValue,
  coverValueFromState,
  coverPositionToHomey,
  coverPositionToDevice,
  CLIMATE_MODE_SETS,
  climateModeFromValue,
  climateValueFromMode,
  climateActionFromValue,
  scaleTemperature,
  unscaleTemperature,
  guessTemperaturePrecision,
  detectColorFormat,
  decodeColor,
  encodeColor,
  BRIGHTNESS_RANGES,
  brightnessToHomey,
  brightnessToDevice,
  colorTempToHomey,
  colorTempToDevice,
  rawToKelvin,
  fanSpeedToPercent,
  percentToFanSpeed,
  FAN_DIRECTIONS,
  detectLightSchema,
  legacyLightToModern,
  modernLightToLegacy,
};
