'use strict';

const { HybridSensorBase } = require('../../lib/devices');

/**
 * Motion Sensor Device - v5.3.64 SIMPLIFIED
 * Extends HybridSensorBase for automatic EF00/ZCL handling
 */
class MotionSensorDevice extends HybridSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_motion', 'measure_battery', 'measure_luminance'];
  }

  get dpMappings() {
    return {
      1: { capability: 'alarm_motion', transform: (v) => v === 1 || v === true },
      2: { capability: 'measure_battery', divisor: 1 },
      3: { capability: 'measure_luminance', divisor: 1 },
      4: { capability: 'measure_battery', divisor: 1 },
      9: { capability: 'measure_luminance', divisor: 1 },  // PIR sensitivity
      12: { capability: 'measure_luminance', divisor: 1 }, // Lux value
      15: { capability: 'measure_battery', divisor: 1 },
      101: { capability: null }, // Sensitivity setting
      102: { capability: null }  // Keep time setting
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[MOTION] ✅ Motion sensor ready');
  }
}

module.exports = MotionSensorDevice;
