'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');

// DP layout from zigbee-herdsman-converters tuya.ts ZG-104PLV (Excellux, modelId Excellux / manufacturer PIRIV01) (Koen Kanters and contributors); own implementation, credited in CREDITS.md.
// Nothing is written to the Tuya cluster (0xEF00) at pairing; the endpoint declares only Basic/Groups/Scenes.

class MotionSensorExcelluxZg104plvDevice extends TuyaDpProfileDevice {
  profileFor() {
    return {
      capabilities: ['alarm_motion', 'measure_battery', 'measure_luminance'],
      dps: {
        1: { cap: 'alarm_motion', kind: 'bool' },
        4: { cap: 'measure_battery', kind: 'value', readOnly: true },
        20: { cap: 'measure_luminance', kind: 'value', readOnly: true },
      },
    };
  }
}

module.exports = MotionSensorExcelluxZg104plvDevice;
