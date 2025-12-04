'use strict';

const { HybridSensorBase } = require('../../lib/devices');

/**
 * Soil Sensor Device - v5.3.64 SIMPLIFIED
 */
class SoilSensorDevice extends HybridSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  get dpMappings() {
    return {
      // Soil sensors typically use:
      3: { capability: 'measure_temperature', divisor: 10 }, // Soil temperature
      5: { capability: 'measure_humidity', divisor: 10 },    // Soil moisture %
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SOIL] ✅ Soil sensor ready');
  }
}

module.exports = SoilSensorDevice;
