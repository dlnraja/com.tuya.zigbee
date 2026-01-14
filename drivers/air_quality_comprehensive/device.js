'use strict';
const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

class AirQualityComprehensiveDevice extends HybridSensorBase {
  get mainsPowered() { return true; }
  get sensorCapabilities() { return ['measure_co2', 'measure_pm25', 'measure_temperature', 'measure_humidity']; }
  get dpMappings() {
    return {
      2: { capability: 'measure_co2', divisor: 1 },
      18: { capability: 'measure_temperature', divisor: 10 },
      19: { capability: 'measure_humidity', divisor: 10 },
      20: { capability: 'measure_pm25', divisor: 1 }
    };
  }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[AIR-QUALITY] ✅ Ready');
  }
}
module.exports = AirQualityComprehensiveDevice;
