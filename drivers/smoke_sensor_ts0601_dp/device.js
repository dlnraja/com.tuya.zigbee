'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');

// DP layout from zigbee-herdsman-converters tuya.ts TS0601_smoke_4 (_TZE200_yh7aoahi, t5p1vj8r, uebojraa, vzekyi4c, dq1mfjug) and TS0601_smoke_1 (_TZE204_ntcy3xu1) (Koen Kanters and contributors); own implementation, credited in CREDITS.md.
// Nothing is written to the Tuya cluster (0xEF00) at pairing; the endpoint declares only Basic/Groups/Scenes.

class SmokeSensorTs0601DpDevice extends TuyaDpProfileDevice {
  profileFor() {
    return {
      capabilities: ['alarm_smoke', 'alarm_tamper', 'measure_battery'],
      dps: {
        1: { cap: 'alarm_smoke', kind: 'inSet', set: [0] },
        4: { cap: 'alarm_tamper', kind: 'bool' },
        14: { cap: null, kind: 'value', readOnly: true }, // battery_state: measure_battery fallback in _onProfileDP
        15: { cap: 'measure_battery', kind: 'value', readOnly: true },
      },
    };
  }

  // P3043: Homey guidelines forbid measure_battery + alarm_battery on one driver (BATTERY_CAPABILITY_CONFLICT,
  // red in CI since P3039d). DP15 (percentage) feeds measure_battery; DP14 battery_state (0 low, 1 medium,
  // 2 high) is kept as a fallback percentage only until DP15 has been seen, so a unit that reports only DP14
  // still shows a low battery.
  _onProfileDP(dp, raw) {
    if (dp === 15) { this._dp15Seen = true; }
    if (dp === 14) {
      if (this._destroyed || this._dp15Seen || !this.hasCapability('measure_battery')) { return; }
      const pct = { 0: 10, 1: 50, 2: 100 }[Number(raw)];
      if (pct !== undefined) { this.safeSetCapabilityValue('measure_battery', pct); }
      return;
    }
    super._onProfileDP(dp, raw);
  }
}

module.exports = SmokeSensorTs0601DpDevice;
