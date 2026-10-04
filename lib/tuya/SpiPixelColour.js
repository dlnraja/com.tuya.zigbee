'use strict';

// Pure helpers for the Gledopto GL-SPI-206P (DP layout from zigbee-herdsman-converters gledopto.ts, Koen Kanters
// and contributors; own implementation). DP61 colour frame: 00 01 01 14 00 | hue(2) | sat 0-1000 (2) | value 0-1000 (2).
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function colourPayload(hue01, sat01) {
  const h = clamp(Math.round(Number(hue01) * 360), 0, 360);
  const s = clamp(Math.round(Number(sat01) * 1000), 0, 1000);
  const v = 1000;
  return Buffer.from([0x00, 0x01, 0x01, 0x14, 0x00, (h >> 8) & 0xff, h & 0xff, (s >> 8) & 0xff, s & 0xff, (v >> 8) & 0xff, v & 0xff]);
}

/** Homey dim 0-1 -> DP3 10-1000 (the firmware rejects values below 10). */
function dimToDp(dim) {
  return clamp(Math.round(Number(dim) * 1000), 10, 1000);
}

module.exports = { colourPayload, dimToDp };
