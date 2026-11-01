'use strict';
// P3150 (t733u findings): small, additive DP guards confirmed by upstream sources.
// Credit: zigpy/zha-device-handlers PR #5514 (NAS-PS10B2 DP12 unset value, see also
// Koenkk/zigbee-herdsman-converters#11831) and PR #4817 (Zemismart ZM25EL DP5 motor direction enum).
// No upstream code copied; only the documented facts.

const FADING_UNSET_MFRS = /1youk3hj/i;
// PR #5514: DP12 fading time is 3..600 s; an unconfigured device reports 0xFFFFFF08 (-248 as int32).
function isUnsetFadingTime(mfr, dp, value) {
  if (Number(dp) !== 12 || !FADING_UNSET_MFRS.test(String(mfr || ''))) {return false;}
  const n = Number(value);
  if (!Number.isFinite(n)) {return false;}
  return n < 3 || n > 600;
}

const ZM25EL_DIRECTION_MFRS = new Set(['_tze200_68nvbio9', '_tze200_pw7mji0l']);
// PR #4817: DP5 motor direction is an enum, 0 = forward, 1 = back.
function zm25elDirectionDp(mfr, reverse) {
  if (!ZM25EL_DIRECTION_MFRS.has(String(mfr || '').trim().toLowerCase())) {return null;}
  return { dp: 5, value: reverse ? 1 : 0, type: 'enum' };
}

module.exports = { isUnsetFadingTime, zm25elDirectionDp };
