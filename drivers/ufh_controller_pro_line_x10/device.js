'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');

// DP layout from zigbee-herdsman-converters tuya.ts Pro Line X10 (Tervix, _TZE204_rfpyqax9/_TZE284_rfpyqax9) (Koen Kanters and contributors); own implementation, credited in CREDITS.md.
// Nothing is written to the Tuya cluster (0xEF00) at pairing; the endpoint declares only Basic/Groups/Scenes.

class UfhControllerProLineX10Device extends TuyaDpProfileDevice {
  get mainsPowered() { return true; }

  profileFor() {
    return {
      capabilities: ['onoff', 'onoff.z1', 'onoff.z2', 'onoff.z3', 'onoff.z4', 'onoff.z5', 'onoff.z6', 'onoff.z7', 'onoff.z8', 'alarm_generic.pump', 'alarm_generic.boiler', 'hvac_system_mode'],
      dps: {
        33: { cap: 'onoff', kind: 'bool' },
        101: { cap: 'onoff.z1', kind: 'bool' },
        102: { cap: 'onoff.z2', kind: 'bool' },
        103: { cap: 'onoff.z3', kind: 'bool' },
        104: { cap: 'onoff.z4', kind: 'bool' },
        105: { cap: 'onoff.z5', kind: 'bool' },
        106: { cap: 'onoff.z6', kind: 'bool' },
        107: { cap: 'onoff.z7', kind: 'bool' },
        108: { cap: 'onoff.z8', kind: 'bool' },
        109: { cap: 'alarm_generic.pump', kind: 'inSet', set: [1] },
        110: { cap: 'alarm_generic.boiler', kind: 'inSet', set: [1] },
        111: { cap: 'hvac_system_mode', kind: 'enum', map: { 0: 'cool', 1: 'heat' } },
      },
    };
  }
}

module.exports = UfhControllerProLineX10Device;
