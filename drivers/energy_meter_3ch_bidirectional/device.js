'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');

// DP layout from zigbee-herdsman-converters tuya.ts TS0601_3ch_bidirectional_meter (_TZE20C1000000_p3g8xiug) (Koen Kanters and contributors); own implementation, credited in CREDITS.md.
// Nothing is written to the Tuya cluster (0xEF00) at pairing; the endpoint declares only Basic/Groups/Scenes.

class EnergyMeter3chBidirectionalDevice extends TuyaDpProfileDevice {
  get mainsPowered() { return true; }

  profileFor() {
    return {
      capabilities: ['meter_power', 'meter_power.produced', 'measure_power', 'onoff', 'measure_voltage', 'measure_current.a', 'measure_current.b', 'measure_current.c', 'measure_power.a', 'measure_power.b', 'measure_power.c', 'measure_power_factor.a', 'measure_power_factor.b', 'measure_power_factor.c', 'meter_power.a', 'meter_power.reverse_a', 'meter_power.b', 'meter_power.reverse_b', 'meter_power.c', 'meter_power.reverse_c', 'measure_temperature'],
      dps: {
        1: { cap: 'meter_power', kind: 'value', divisor: 100, readOnly: true },
        2: { cap: 'meter_power.produced', kind: 'value', divisor: 100, readOnly: true },
        9: { cap: 'measure_power', kind: 'value', divisor: 10, readOnly: true },
        16: { cap: 'onoff', kind: 'bool' },
        101: { cap: 'measure_voltage', kind: 'value', divisor: 10, readOnly: true },
        102: { cap: 'measure_current.a', kind: 'value', divisor: 1000, readOnly: true },
        103: { cap: 'measure_current.b', kind: 'value', divisor: 1000, readOnly: true },
        104: { cap: 'measure_current.c', kind: 'value', divisor: 1000, readOnly: true },
        105: { cap: 'measure_power.a', kind: 'value', divisor: 10, readOnly: true },
        106: { cap: 'measure_power.b', kind: 'value', divisor: 10, readOnly: true },
        107: { cap: 'measure_power.c', kind: 'value', divisor: 10, readOnly: true },
        108: { cap: 'measure_power_factor.a', kind: 'value', divisor: 100, readOnly: true },
        109: { cap: 'measure_power_factor.b', kind: 'value', divisor: 100, readOnly: true },
        110: { cap: 'measure_power_factor.c', kind: 'value', divisor: 100, readOnly: true },
        125: { cap: 'meter_power.a', kind: 'value', divisor: 100, readOnly: true },
        126: { cap: 'meter_power.reverse_a', kind: 'value', divisor: 100, readOnly: true },
        127: { cap: 'meter_power.b', kind: 'value', divisor: 100, readOnly: true },
        128: { cap: 'meter_power.reverse_b', kind: 'value', divisor: 100, readOnly: true },
        129: { cap: 'meter_power.c', kind: 'value', divisor: 100, readOnly: true },
        130: { cap: 'meter_power.reverse_c', kind: 'value', divisor: 100, readOnly: true },
        131: { cap: 'measure_temperature', kind: 'value', divisor: 10, readOnly: true },
      },
    };
  }
}

module.exports = EnergyMeter3chBidirectionalDevice;
