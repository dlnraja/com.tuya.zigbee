'use strict';

const { HybridSensorBase } = require('../../lib/devices');

/**
 * CO Sensor Device - v5.3.64 SIMPLIFIED
 */
class COSensorDevice extends HybridSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_co', 'measure_co', 'measure_battery'];
  }

  get dpMappings() {
    return {
      1: { capability: 'alarm_co', transform: (v) => v === 1 || v === true },
      2: { capability: 'measure_co', divisor: 1 }, // CO concentration ppm
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[CO] ✅ CO sensor ready');
  }
}

module.exports = COSensorDevice;
