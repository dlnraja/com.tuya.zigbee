'use strict';

/**
 * WHY(P3011): soil drivers checked includesCI(mfr, '_tze200_oitavov2') — reversed
 * argument order, always false, so oitavov2 DP5 always went through the legacy
 * scaling branch. Zigbee2MQTT tuya.ts `TS0601_soil` maps DP5 temperature with
 * tuya.valueConverter.raw (already °C) for the oitavov2 family.
 * Detect-and-merge: raw °C is used only when the mfr matches AND the value is
 * physically plausible; anything else uses the auto-detect scale.
 *
 * The pre-P3011 legacy branch called safeMultiply() which the soil drivers never
 * imported (ReferenceError → DP5 temperature was never set) and multiplied where
 * the original v9.0.192 comment documents a DIVISION:
 *   ">1000 = ÷100, 100-1000 = ÷10, <=100 = raw °C (QT-07S)".
 * autoScale restores that documented intent.
 */
const { includesCI } = require('../utils/TuyaNormalizer');

const RAW_CELSIUS_MFRS = Object.freeze(['_TZE284_oitavov2', '_TZE200_oitavov2']);
const PLAUSIBLE_MIN = -40;
const PLAUSIBLE_MAX = 80;

function isRawCelsiusMfr(mfr) {
  return includesCI(RAW_CELSIUS_MFRS, String(mfr || ''));
}

/** Documented auto-detect scale (v9.0.192 comment): >1000 ÷100, >100 ÷10, else raw. */
function autoScale(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) {return NaN;}
  if (Math.abs(v) > 1000) {return Math.round(v) / 100;}
  if (Math.abs(v) > 100) {return Math.round(v) / 10;}
  return v;
}

/** @returns {{temp:number, mode:'raw_celsius'|'auto'}} */
function scaleSoilDp5(mfr, value) {
  const v = Number(value);
  if (isRawCelsiusMfr(mfr) && Number.isFinite(v) && v >= PLAUSIBLE_MIN && v <= PLAUSIBLE_MAX) {
    return { temp: v, mode: 'raw_celsius' };
  }
  return { temp: autoScale(value), mode: 'auto' };
}

module.exports = { RAW_CELSIUS_MFRS, isRawCelsiusMfr, autoScale, scaleSoilDp5 };
