'use strict';

/**
 * P3384 / forum 21313 #2782/#2786 (Calvin): Tuya often ships temperatures as
 * tenths (163 means 16.3 C). Treating the raw integer as Celsius overshoots
 * by 10. Bounded per-device auto-detection: only divisors 1, 10, 100, and
 * only when the raw value is implausible as already-scaled Celsius.
 *
 * Do not invent a couple from the Wi-Fi-only report. Persist a learned
 * divisor after three consistent samples, but never re-apply it to a value
 * that is already in the plausible band.
 */

const DIVISORS = Object.freeze([1, 10, 100]);
const DEFAULT_AMBIENT = Object.freeze({ min: -40, max: 80, typicalMin: -20, typicalMax: 50 });
const DEFAULT_TARGET = Object.freeze({ min: 4, max: 40, typicalMin: 5, typicalMax: 35 });
const DEFAULT_PROBE = Object.freeze({ min: -40, max: 120, typicalMin: -20, typicalMax: 90 });
const LEARN_HITS = 3;

function rangeFor(capability) {
  const cap = String(capability || '');
  if (cap === 'target_temperature' || cap.startsWith('target_temperature.')) {return DEFAULT_TARGET;}
  if (cap.includes('probe') || cap.includes('floor') || cap.includes('water')) {return DEFAULT_PROBE;}
  return DEFAULT_AMBIENT;
}

function inRange(value, range) {
  return Number.isFinite(value) && value >= range.min && value <= range.max;
}

function inTypical(value, range) {
  return Number.isFinite(value) && value >= range.typicalMin && value <= range.typicalMax;
}

function roundTenth(value) {
  return Math.round(value * 10) / 10;
}

/**
 * Choose a divisor for one sample. A learned divisor is used only when the
 * raw value would otherwise be implausible; an already-scaled 16.3 stays 16.3.
 */
function chooseDivisor(raw, options) {
  const value = Number(raw);
  if (!Number.isFinite(value)) {return { divisor: 1, value: null, reason: 'nan' };}
  const cap = options && options.capability;
  const range = (options && options.range) || rangeFor(cap);
  const learned = options && Number(options.learned);
  const hasLearned = DIVISORS.includes(learned);

  if (inRange(value, range)) {
    // Already-scaled: keep as-is even if a divisor was learned earlier.
    return { divisor: 1, value: roundTenth(value), reason: 'in-range' };
  }

  if (hasLearned && learned > 1) {
    const scaled = value / learned;
    if (inRange(scaled, range)) {
      return { divisor: learned, value: roundTenth(scaled), reason: 'learned' };
    }
  }

  let best = null;
  for (const divisor of DIVISORS) {
    if (divisor === 1) {continue;}
    const scaled = value / divisor;
    if (!inRange(scaled, range)) {continue;}
    const score = (inTypical(scaled, range) ? 2 : 1) - (divisor === 10 ? 0 : 0.1);
    if (!best || score > best.score) {best = { divisor, value: roundTenth(scaled), reason: 'auto', score };}
  }
  if (best) {return { divisor: best.divisor, value: best.value, reason: best.reason };}
  return { divisor: 1, value: inRange(value, range) ? roundTenth(value) : null, reason: 'implausible' };
}

function scaleTemperature(raw, options) {
  return chooseDivisor(raw, options || {});
}

/**
 * Per-device store: counts consistent auto-divisors and returns the learned
 * value after LEARN_HITS hits. The store shape is { [capability]: { divisor, hits } }.
 */
function recordSample(store, capability, result) {
  const out = store && typeof store === 'object' ? store : {};
  const cap = String(capability || 'measure_temperature');
  if (!result || result.reason === 'in-range' || result.reason === 'nan' || result.reason === 'implausible') {
    return out;
  }
  const divisor = result.divisor;
  if (!DIVISORS.includes(divisor) || divisor === 1) {return out;}
  const prev = out[cap] || { divisor: 0, hits: 0 };
  if (prev.divisor === divisor) {
    out[cap] = { divisor, hits: prev.hits + 1 };
  } else {
    out[cap] = { divisor, hits: 1 };
  }
  return out;
}

function learnedDivisor(store, capability) {
  const cap = String(capability || 'measure_temperature');
  const entry = store && store[cap];
  if (!entry || entry.hits < LEARN_HITS) {return null;}
  return DIVISORS.includes(entry.divisor) ? entry.divisor : null;
}

module.exports = {
  DIVISORS,
  LEARN_HITS,
  rangeFor,
  chooseDivisor,
  scaleTemperature,
  recordSample,
  learnedDivisor,
};
