'use strict';

const { HybridSensorBase } = require('../../lib/devices');

/**
 * Water Leak Sensor Device - v5.3.64 SIMPLIFIED
 */
class WaterLeakSensorDevice extends HybridSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_water', 'measure_battery'];
  }

  get dpMappings() {
    return {
      1: { capability: 'alarm_water', transform: (v) => v === 1 || v === true },
      4: { capability: 'measure_battery', divisor: 1 },
      14: { capability: 'alarm_battery', transform: (v) => v === 1 },
      15: { capability: 'measure_battery', divisor: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[WATER] ✅ Water leak sensor ready');
  }
}

module.exports = WaterLeakSensorDevice;
