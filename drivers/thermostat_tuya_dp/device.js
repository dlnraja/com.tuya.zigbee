'use strict';
const { HybridThermostatBase } = require('../../lib/devices/HybridThermostatBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      THERMOSTAT / TRV - v5.5.129 FIXED (extends HybridThermostatBase)       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  HybridThermostatBase handles: target_temperature listener, ZCL Thermostat  ║
 * ║  This class ONLY: dpMappings                                                ║
 * ║  DPs: 1-9,13-17,24,35,36,101 | ZCL: 513,516,1,EF00                         ║
 * ║  Variants: Beca, Beok, Moes, AVATTO TRV, Saswell                           ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class ThermostatTuyaDPDevice extends HybridThermostatBase {

  get mainsPowered() { return false; }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === true || v === 1 },
      2: { capability: 'target_temperature', divisor: 10 },
      3: { capability: 'measure_temperature', divisor: 10 },
      4: { capability: 'thermostat_mode', transform: (v) => ({ 0: 'auto', 1: 'heat', 2: 'off', 3: 'eco', 4: 'boost' }[v] || 'auto') },
      5: { capability: 'eco_mode', transform: (v) => v === true || v === 1 },
      6: { capability: 'alarm_contact', transform: (v) => v === true || v === 1 },
      7: { capability: 'child_lock', transform: (v) => v === true || v === 1 },
      8: { capability: 'valve_position', divisor: 1 },
      9: { capability: 'boost_mode', transform: (v) => v === true || v === 1 },
      10: { capability: null, internal: 'sound', writable: true },
      13: { capability: 'measure_battery', divisor: 1 },
      14: { capability: null, internal: 'min_temp', divisor: 10 },
      15: { capability: null, internal: 'max_temp', divisor: 10 },
      16: { capability: 'target_temperature', divisor: 2 },
      17: { capability: null, internal: 'deadzone', divisor: 10 },
      24: { capability: 'target_temperature', divisor: 2 },
      35: { capability: 'measure_humidity', divisor: 1 },
      36: { capability: 'heating', transform: (v) => v === 1 || v === true },
      101: { capability: null, internal: 'battery_low', transform: (v) => v === 1 || v === 'low' } // SDK3: alarm_battery obsolète
    };
  }

  async onNodeInit({ zclNode }) {
    // Parent handles ALL: target_temperature listener, ZCL Thermostat
    await super.onNodeInit({ zclNode });
    this.log('[THERMOSTAT] v5.5.129 - DPs: 1-9,13-17,24,35,36,101 | ZCL: 513,516,1,EF00');
    this.log('[THERMOSTAT] ✅ Ready');
  }
}

module.exports = ThermostatTuyaDPDevice;
