'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');

// DP layout from zigbee-herdsman-converters tuya.ts TS0601_smoke_4 (_TZE200_yh7aoahi) (Koen Kanters and contributors); own implementation, credited in CREDITS.md.
// Nothing is written to the Tuya cluster (0xEF00) at pairing; the endpoint declares only Basic/Groups/Scenes.

class SmokeSensorTs0601DpDevice extends TuyaDpProfileDevice {
  profileFor() {
    return {
      capabilities: ['alarm_smoke', 'alarm_battery', 'measure_battery'],
      dps: {
        1: { cap: 'alarm_smoke', kind: 'inSet', set: [0] },
        14: { cap: 'alarm_battery', kind: 'inSet', set: [0] },
        15: { cap: 'measure_battery', kind: 'value', readOnly: true },
      },
    };
  }
}

module.exports = SmokeSensorTs0601DpDevice;
