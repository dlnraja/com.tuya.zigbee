'use strict';

/**
 * P3245 (GH#581 hogseto): shared ZCL relativeHumidity scaling for every driver.
 * WHY: several legacy/continuation drivers did `measuredValue / 100` directly, so
 * TS0201 clones that report %RH x10 (427 = 42.7 %) showed 4.27 %. UnifiedSensorBase
 * already had the quirk; this makes the same rule available everywhere (additive).
 * Returns an UNROUNDED %RH number, or null when raw is not a finite number.
 */
const X10_MFRS = new Set([
  '_tz3000_isw9u95y',
  '_tz3000_xr3htd96',
  '_tz3000_zl1kmjqx',
  '_tz3000_yupc0pb7',
  '_tz3210_ncw88jfq',
  '_tz3000_ywagc4rj',
]);

function scaleZclHumidity(raw, manufacturerName) {
  const n = Number(raw);
  if (!Number.isFinite(n)) {return null;}
  const mfr = String(manufacturerName || '').toLowerCase();
  if (X10_MFRS.has(mfr)) {return n / 10;}
  // Adaptive: 1.00-14.99 % is implausible for these sensors; prefer the x10 reading.
  if (n >= 100 && n < 1500 && Number.isInteger(n)) {return n / 10;}
  return n / 100;
}

function mfrOf(device) {
  try {
    return device?.getSetting?.('zb_manufacturer_name')
      || device?.getStoreValue?.('manufacturerName')
      || device?.getData?.()?.manufacturerName
      || device?.zclNode?.manufacturerName
      || '';
  } catch (_) { return ''; }
}

module.exports = { scaleZclHumidity, mfrOf, X10_MFRS };
