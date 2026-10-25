'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');

// DP layout from zigbee-herdsman-converters tuya.ts DCR-CO (_TZE200_7bztmfm1/_TZE204_7bztmfm1, legacy tuya_CO) (Koen Kanters and contributors); own implementation, credited in CREDITS.md.
// Nothing is written to the Tuya cluster (0xEF00) at pairing; the endpoint declares only Basic/Groups/Scenes.

class CoSensorDcrCoDevice extends TuyaDpProfileDevice {
  get mainsPowered() { return true; }

  profileFor() {
    return {
      capabilities: ['alarm_co', 'measure_co'],
      dps: {
        1: { cap: 'alarm_co', kind: 'inSet', set: [0] },
        2: { cap: 'measure_co', kind: 'value', divisor: 100, readOnly: true },
      },
    };
  }
}

module.exports = CoSensorDcrCoDevice;
