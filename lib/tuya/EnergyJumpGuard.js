'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║              ENERGY JUMP GUARD — Defensive cumulative-energy check          ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Forum bug (topic 140352, posts #2092/#2093): a meter showed ~660 kWh for   ║
 * ║  ~1 kWh real consumption. Root cause: some Tuya device families report the  ║
 * ║  energy DP with a different divisor than the family default (÷100 vs        ║
 * ║  ÷1000 / ÷10), so a wrong-divisor parse yields absurd cumulative values.    ║
 * ║                                                                              ║
 * ║  This guard is GENERIC and DEFENSIVE — it does not guess divisors per mfr.  ║
 * ║  It watches meter_power (cumulative kWh, must be non-decreasing and slowly  ║
 * ║  growing) and, on an impossible jump, tries the alternate divisors (×0.1,   ║
 * ║  ×0.01). The first correction that makes the report plausible again is      ║
 * ║  applied and KEPT (sticky factor) so all subsequent reports of this device  ║
 * ║  stay consistent. Everything is logged so a diagnostic reveals the true     ║
 * ║  device family divisor.                                                      ║
 * ║                                                                              ║
 * ║  Usage (in a driver device.js):                                              ║
 * ║    const EnergyJumpGuard = require('../../lib/tuya/EnergyJumpGuard');        ║
 * ║    async safeSetCapabilityValue(cap, value) {                                ║
 * ║      if (cap === 'meter_power') value = EnergyJumpGuard.check(this, value);  ║
 * ║      return super.safeSetCapabilityValue(cap, value);                        ║
 * ║    }                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// A single report can never legitimately add more than this (a whole house
// uses ~50 kWh/day; reports arrive far more often than that).
const MAX_PLAUSIBLE_JUMP_KWH = 500;

// "Recent history is small" threshold from the forum report analysis.
const LOW_HISTORY_KWH = 100;

// An absolute cumulative value above this is suspicious when history was low.
const ABSURD_ABSOLUTE_KWH = 10000;

// Alternate divisor corrections tried on an impossible jump, in order.
const ALT_FACTORS = [0.1, 0.01];

/**
 * Check a cumulative meter_power value (kWh) for an impossible jump.
 *
 * @param {Object} device - Device instance (needs .log; state kept on device._energyJumpGuard)
 * @param {number} value  - Parsed cumulative kWh about to be set on meter_power
 * @returns {number} The value to actually set (possibly corrected)
 */
function check(device, value) {
  if (typeof value !== 'number' || !isFinite(value) || value < 0) {return value;}

  const st = device._energyJumpGuard || (device._energyJumpGuard = { last: null, factor: 1 });

  // Apply the sticky correction factor learned from an earlier impossible jump
  let v = value * st.factor;
  const last = st.last;

  if (last === null) {
    if (v > ABSURD_ABSOLUTE_KWH) {
      device.log(`[ENERGY-GUARD] ⚠️ First reading ${v} kWh > ${ABSURD_ABSOLUTE_KWH} kWh — kept as-is (no history to compare). If the value looks ×10/×100 too high, this device family uses a different energy DP divisor.`);
    }
    st.last = v;
    return v;
  }

  const jump = v - last;
  const impossible = jump > MAX_PLAUSIBLE_JUMP_KWH ||
    (last < LOW_HISTORY_KWH && v > ABSURD_ABSOLUTE_KWH);

  if (impossible) {
    for (const f of ALT_FACTORS) {
      const cand = value * st.factor * f;
      const candJump = cand - last;
      if (candJump >= -0.001 && candJump <= MAX_PLAUSIBLE_JUMP_KWH && cand <= ABSURD_ABSOLUTE_KWH) {
        st.factor *= f;
        device.log(`[ENERGY-GUARD] 🔧 Impossible energy jump ${last} → ${v} kWh (raw=${value}). Alternate divisor fits: applying factor ×${f} → ${cand} kWh (sticky for future reports). Wrong family divisor suspected — please report this log line.`);
        v = cand;
        break;
      }
    }
    if ((v - last) > MAX_PLAUSIBLE_JUMP_KWH || (last < LOW_HISTORY_KWH && v > ABSURD_ABSOLUTE_KWH)) {
      device.log(`[ENERGY-GUARD] ⚠️ Impossible energy jump ${last} → ${v} kWh (raw=${value}) — no alternate divisor makes it plausible; accepting raw value. Device family likely needs a dedicated divisor mapping.`);
    }
  }

  st.last = v;
  return v;
}

/**
 * Reset guard state (tests / re-pairing).
 */
function reset(device) {
  if (device) {delete device._energyJumpGuard;}
}

module.exports = { check, reset, MAX_PLAUSIBLE_JUMP_KWH, LOW_HISTORY_KWH, ABSURD_ABSOLUTE_KWH };
