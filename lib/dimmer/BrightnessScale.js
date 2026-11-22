'use strict';
// P3381 (forum 21313 #300/#302, Dennis): "0-100 % in Smart Life is squeezed into 0-33 % in Homey, then
// starts again". The app wrote a 0-1000 value to a dimmer whose brightness DP is 0-255 (uint8 wrap).
// Tuya dimmers use 0-100, 0-255 (bright_value v1), 10-1000 (bright_value_v2) or 0-1000. Pure helpers to
// pick the scale from a user override, the cloud spec, observed reports, or the echo of a write.
const SCALES = {
  '0-100': { min: 0, max: 100 },
  '0-255': { min: 0, max: 255 },
  '10-1000': { min: 10, max: 1000 },
  '0-1000': { min: 0, max: 1000 },
};
const ORDER = ['0-100', '0-255', '10-1000', '0-1000'];

function isScaleId(id) { return Object.prototype.hasOwnProperty.call(SCALES, id); }

/** Smallest known scale that can hold `max` (cloud spec or observed max). */
function scaleForMax(max) {
  const n = Number(max);
  if (!Number.isFinite(n) || n <= 0) {return null;}
  if (n <= 100) {return '0-100';}
  if (n <= 255) {return '0-255';}
  return '10-1000';
}

/** From a Tuya cloud function spec { min, max } (bright_value / bright_value_v2). */
function scaleFromSpec(spec) {
  if (!spec) {return null;}
  const min = Number(spec.min); const max = Number(spec.max);
  if (!Number.isFinite(max)) {return null;}
  if (max <= 100) {return '0-100';}
  if (max <= 255) {return '0-255';}
  return min >= 10 ? '10-1000' : '0-1000';
}

/**
 * Echo of our own write. If we sent `sent` and the device reported `reported`:
 * reported === sent % 256 (wrap) or reported === 255 (clamp) with sent > 255 -> device is 0-255;
 * same with 100/101 -> device is 0-100. Otherwise null (no evidence).
 */
function scaleFromEcho(sent, reported) {
  const s = Number(sent); const r = Number(reported);
  if (!Number.isInteger(s) || !Number.isInteger(r) || s === r) {return null;}
  if (s > 255 && (r === s % 256 || r === 255)) {return '0-255';}
  if (s > 100 && s <= 255 && (r === 100 || r === s % 101)) {return '0-100';}
  return null;
}

/**
 * Resolve the scale. Priority: user setting (not 'auto') > echo-detected > spec > observed max upgrade > default.
 * An observed value above the current max always upgrades (a device never reports beyond its own range).
 */
function resolveScale({ setting, detected, spec, observedMax, fallback = '10-1000' } = {}) {
  if (isScaleId(setting)) {return setting;}
  let id = isScaleId(detected) ? detected : scaleFromSpec(spec) || (isScaleId(fallback) ? fallback : '10-1000');
  const obs = Number(observedMax);
  if (Number.isFinite(obs) && obs > SCALES[id].max) {
    id = ORDER.find((k) => SCALES[k].max >= obs) || '0-1000';
  }
  return id;
}

function toDim(raw, id) {
  const sc = SCALES[id] || SCALES['10-1000'];
  const n = Number(raw);
  if (!Number.isFinite(n)) {return null;}
  return Math.max(0, Math.min(1, (n - sc.min) / (sc.max - sc.min)));
}

function fromDim(dim, id) {
  const sc = SCALES[id] || SCALES['10-1000'];
  const d = Math.max(0, Math.min(1, Number(dim) || 0));
  return Math.round(sc.min + d * (sc.max - sc.min));
}

module.exports = { SCALES, ORDER, isScaleId, scaleForMax, scaleFromSpec, scaleFromEcho, resolveScale, toDim, fromDim };
