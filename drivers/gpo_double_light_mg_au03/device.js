'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');

// DP layout from zigbee-herdsman-converters makegood.ts MG-AU03 (_TZE200_4jvmbiph) (Koen Kanters and contributors); own implementation, credited in CREDITS.md.
// Nothing is written to the Tuya cluster (0xEF00) at pairing; the endpoint declares only Basic/Groups/Scenes.

class GpoDoubleLightMgAu03Device extends TuyaDpProfileDevice {
  get mainsPowered() { return true; }

  profileFor() {
    return {
      capabilities: ['onoff.l1', 'onoff.l2', 'onoff.l3', 'meter_power', 'measure_current', 'measure_power', 'measure_voltage', 'child_lock', 'onoff'],
      dps: {
        1: { cap: 'onoff.l1', kind: 'bool' },
        2: { cap: 'onoff.l2', kind: 'bool' },
        3: { cap: 'onoff.l3', kind: 'bool' },
        20: { cap: 'meter_power', kind: 'delta', divisor: 1000 },
        21: { cap: 'measure_current', kind: 'value', divisor: 1000, readOnly: true },
        22: { cap: 'measure_power', kind: 'value', divisor: 10, readOnly: true },
        23: { cap: 'measure_voltage', kind: 'value', divisor: 10, readOnly: true },
        101: { cap: 'child_lock', kind: 'bool' },
        136: { cap: 'onoff', kind: 'bool' },
      },
    };
  }
}

module.exports = GpoDoubleLightMgAu03Device;
