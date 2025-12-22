'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

/**
 * Formaldehyde Sensor Device - v5.3.64 SIMPLIFIED
 */
class FormaldehydeSensorDevice extends HybridSensorBase {

  get mainsPowered() { return true; }

  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_pm25', 'measure_co2'];
  }

  get dpMappings() {
    return {
      1: { capability: 'measure_temperature', divisor: 10 },
      2: { capability: 'measure_humidity', divisor: 10 },
      18: { capability: 'measure_pm25', divisor: 1 },      // PM2.5
      19: { capability: 'measure_co2', divisor: 1 },       // CO2 ppm
      20: { capability: 'measure_voc', divisor: 1 },       // VOC
      21: { capability: null }                              // Formaldehyde (custom)
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[FORMALDEHYDE] ✅ Formaldehyde sensor ready');
  }
}

module.exports = FormaldehydeSensorDevice;
