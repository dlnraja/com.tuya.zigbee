'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');

// DP layout from zigbee-herdsman-converters beca.ts BVRF-L001 (_TZE204_6ewjlefg) (Koen Kanters and contributors); own implementation, credited in CREDITS.md.
// Nothing is written to the Tuya cluster (0xEF00) at pairing; the endpoint declares only Basic/Groups/Scenes.

class ThermostatVrfBvrfL001Device extends TuyaDpProfileDevice {
  get mainsPowered() { return true; }

  profileFor() {
    return {
      capabilities: ['onoff', 'hvac_system_mode', 'target_temperature', 'measure_temperature', 'child_lock', 'fan_mode'],
      dps: {
        1: { cap: 'onoff', kind: 'bool' },
        2: { cap: 'hvac_system_mode', kind: 'enum', map: { 0: 'cool', 1: 'heat', 2: 'fan_only', 3: 'dry' } },
        16: { cap: 'target_temperature', kind: 'value', divisor: 10 },
        24: { cap: 'measure_temperature', kind: 'value', divisor: 10, readOnly: true },
        40: { cap: 'child_lock', kind: 'bool' },
        49: { cap: 'fan_mode', kind: 'enum', map: { 0: 'auto', 1: 'low', 2: 'medium', 3: 'high' } },
      },
    };
  }
}

module.exports = ThermostatVrfBvrfL001Device;
