'use strict';
const HybridPlugBase = require('../../lib/devices/HybridPlugBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      IRRIGATION VALVE - v5.5.129 FIXED (extends HybridPlugBase properly)    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  HybridPlugBase handles: onoff listener, Tuya DP, ZCL On/Off                ║
 * ║  This class: dpMappings + startWatering action                              ║
 * ║  DPs: 1,5-7,11,13-15,101-104 | ZCL: 6,1,EF00                               ║
 * ║  Models: TS0601, _TZE200_*, Smart irrigation controller                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class ValveIrrigationDevice extends HybridPlugBase {

  get plugCapabilities() { return ['onoff', 'measure_battery']; }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      5: { capability: null, internal: 'countdown_timer', writable: true },
      6: { capability: null, internal: 'remaining_time' },
      7: { capability: 'meter_water', divisor: 1 },
      11: { capability: null, internal: 'weather_delay', writable: true },
      13: { capability: 'measure_battery', divisor: 1 },
      14: { capability: null, internal: 'battery_low', transform: (v) => v === 1 || v === 'low' }, // SDK3: alarm_battery obsolète
      15: { capability: 'measure_battery', divisor: 1 },
      101: { capability: null, internal: 'last_water_time' },
      102: { capability: null, internal: 'water_cycle', writable: true },
      103: { capability: null, internal: 'frost_protection', writable: true },
      104: { capability: 'meter_water', divisor: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    // Parent handles onoff listener - DO NOT re-register
    await super.onNodeInit({ zclNode });
    this.log('[VALVE-IRR] v5.5.129 - DPs: 1,5-7,11,13-15,101-104 | ZCL: 6,1,EF00');

    // Add meter_water capability if not present
    if (!this.hasCapability('meter_water')) {
      try { await this.addCapability('meter_water'); } catch (e) { /* ignore */ }
    }

    this.log('[VALVE-IRR] ✅ Ready');
  }

  async startWatering(minutes) {
    this.log(`[VALVE-IRR] 💧 Starting watering for ${minutes} minutes`);
    const tuya = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (tuya?.datapoint) {
      await tuya.datapoint({ dp: 5, value: minutes, type: 'value' });
      await tuya.datapoint({ dp: 1, value: true, type: 'bool' });
    }
  }
}

module.exports = ValveIrrigationDevice;
