'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

/**
 * Rain Sensor Device - v5.3.64 SIMPLIFIED
 */
class RainSensorDevice extends HybridSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_water', 'measure_battery'];
  }

  get dpMappings() {
    return {
      1: { capability: 'alarm_water', transform: (v) => v === 1 || v === true }, // Rain detected
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[RAIN] ✅ Rain sensor ready');
  }
}

module.exports = RainSensorDevice;
