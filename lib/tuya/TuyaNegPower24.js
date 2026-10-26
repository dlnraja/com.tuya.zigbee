'use strict';

/**
 * Signed decoding of the 24-bit active power field found in Tuya packed "phase" DPs.
 *
 * Two negative encodings exist in the field and never overlap, so both are accepted:
 *   0x000000..0x7fffff  positive power in W
 *   0x800000..0x99999a  offset form, power = raw - 0x99999a (down to about -1.67 MW, 0x99999a = 0 W)
 *   0x99999b..0xffffff  plain 24-bit two's complement, power = raw - 0x1000000 (e.g. 0xfffff7 = -9 W)
 *
 * Before this module only the offset form was decoded, so a meter using two's complement
 * showed a huge positive power (0xfffff7 gave about 6.7 MW) instead of a small export value.
 * Values in the first two ranges decode exactly as before (additive change).
 *
 * Source: zigbee-herdsman-converters src/lib/tuya.ts (Koen Kanters and contributors,
 * week of 2026-10-19, observed on some _TZE200_nslr42tt units). Own implementation, no code copied.
 */

const NEG_THRESHOLD = 0x800000;
const NEG_OFFSET = 0x99999a;
const MODULUS = 0x1000000;

function signedPower24(raw) {
  const p = Number(raw) & 0xffffff;
  if (p > NEG_OFFSET) {return p - MODULUS;}
  if (p >= NEG_THRESHOLD) {return p - NEG_OFFSET;}
  return p;
}

module.exports = { signedPower24, NEG_THRESHOLD, NEG_OFFSET, MODULUS };
