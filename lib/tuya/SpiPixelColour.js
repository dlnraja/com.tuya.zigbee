'use strict';

// Pure helpers for the Gledopto GL-SPI-206P (DP layout from zigbee-herdsman-converters gledopto.ts, Koen Kanters
// and contributors; own implementation). DP61 colour frame: 00 01 01 14 00 | hue(2) | sat 0-1000 (2) | value 0-1000 (2).
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * @param {number} hue01 Homey light_hue 0-1 (wrapped to 0-359, 1.0 -> 0)
 * @param {number} sat01 Homey light_saturation 0-1
 * @param {number} [value] DP3-scale brightness 10-1000; default 1000 (legacy behaviour)
 */
function colourPayload(hue01, sat01, value) {
  const raw = Math.round(Number(hue01) * 360);
  const h = Number.isFinite(raw) ? ((raw % 360) + 360) % 360 : 0;
  const s = clamp(Math.round(Number(sat01) * 1000) || 0, 0, 1000);
  const v = value === undefined ? 1000 : clamp(Math.round(Number(value)) || 10, 10, 1000);
  return Buffer.from([0x00, 0x01, 0x01, 0x14, 0x00, (h >> 8) & 0xff, h & 0xff, (s >> 8) & 0xff, s & 0xff, (v >> 8) & 0xff, v & 0xff]);
}

/** Homey dim 0-1 -> DP3 10-1000 (the firmware rejects values below 10). */
function dimToDp(dim) {
  return clamp(Math.round(Number(dim) * 1000), 10, 1000);
}

/** Homey light_temperature 0 (cold) -1 (warm) -> DP4 0-1000 (0 = warm). */
function tempToDp(t) {
  return clamp(Math.round((1 - Number(t)) * 1000) || 0, 0, 1000);
}

module.exports = { colourPayload, dimToDp, tempToDp };
