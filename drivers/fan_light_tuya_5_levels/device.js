'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');

// DP layout from zigbee-herdsman-converters tuya.ts TS0601_fan_5_levels_and_light_5_levels (_TZE284_ikul00sx)
// (Koen Kanters and contributors); own implementation, credited in CREDITS.md.
// The fan speed and the light level only accept 5 raw levels; 'levels' maps them to 0.2/0.4/0.6/0.8/1.
// Nothing is written to the Tuya cluster (0xEF00) at pairing.

const LEVELS = [300, 410, 520, 650, 1000];

class FanLightTuya5LevelsDevice extends TuyaDpProfileDevice {
  profileFor() {
    return {
      capabilities: ['onoff', 'dim', 'onoff.light', 'dim.light'],
      dps: {
        1: { cap: 'onoff', kind: 'bool' },
        6: { cap: 'dim', kind: 'levels', levels: LEVELS },
        104: { cap: 'onoff.light', kind: 'bool' },
        105: { cap: 'dim.light', kind: 'levels', levels: LEVELS },
      },
    };
  }
}

module.exports = FanLightTuya5LevelsDevice;
