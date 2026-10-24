'use strict';

/**
 * P3002b — 18-byte "V2" phase datapoint (phase_a DP6 on Powbay JGQW01-class breakers).
 *
 * Layout (big-endian), from the device's Tuya "Query Things Data Model" as decoded by
 * make-all/tuya-local commit 8b12d78806 (issue #5776). Own implementation, no code copied:
 *   [0] version 0x02 · [1] length 0x0F
 *   [2..3] voltage 0.1 V · [4..6] current mA · [7..9] active power W (0.001 kW)
 *   [10..12] reactive power var · [13..15] apparent power VA · [16] power factor 0.01
 *   [17] direction flags: 0x01 current, 0x02 active power, 0x04 reactive power,
 *        0x08 power factor (bit set = negative)
 * Only used when the payload is exactly this shape; the 8-byte layout stays the default.
 */

const LEN = 18;
const VERSION = 0x02;

function u24(b, o) { return (b[o] << 16) | (b[o + 1] << 8) | b[o + 2]; }

function isPhaseLongV2(buf) {
  return Buffer.isBuffer(buf) && buf.length === LEN && buf[0] === VERSION && buf[1] === 0x0f;
}

/** @returns {{voltage:number,current:number,power:number,reactivePower:number,apparentPower:number,powerFactor:number}|null} */
function decodePhaseLongV2(buf) {
  if (!isPhaseLongV2(buf)) {return null;}
  const flags = buf[17];
  const sign = (bit) => flags & bit ? -1 : 1;
  return {
    voltage: ((buf[2] << 8) | buf[3]) / 10,
    current: sign(0x01) * u24(buf, 4) / 1000,
    power: sign(0x02) * u24(buf, 7),
    reactivePower: sign(0x04) * u24(buf, 10),
    apparentPower: u24(buf, 13),
    powerFactor: sign(0x08) * buf[16] / 100,
  };
}

module.exports = { isPhaseLongV2, decodePhaseLongV2 };
