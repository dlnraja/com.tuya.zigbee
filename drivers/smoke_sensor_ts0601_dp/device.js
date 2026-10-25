'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');

// DP layout from zigbee-herdsman-converters tuya.ts TS0601_smoke_4 (_TZE200_yh7aoahi, t5p1vj8r, uebojraa, vzekyi4c, dq1mfjug) and TS0601_smoke_1 (_TZE204_ntcy3xu1) (Koen Kanters and contributors); own implementation, credited in CREDITS.md.
// Nothing is written to the Tuya cluster (0xEF00) at pairing; the endpoint declares only Basic/Groups/Scenes.

class SmokeSensorTs0601DpDevice extends TuyaDpProfileDevice {
  profileFor() {
    return {
      capabilities: ['alarm_smoke', 'alarm_tamper', 'alarm_battery', 'measure_battery'],
      dps: {
        1: { cap: 'alarm_smoke', kind: 'inSet', set: [0] },
        4: { cap: 'alarm_tamper', kind: 'bool' },
        14: { cap: 'alarm_battery', kind: 'inSet', set: [0] },
        15: { cap: 'measure_battery', kind: 'value', readOnly: true },
      },
    };
  }
}

module.exports = SmokeSensorTs0601DpDevice;
