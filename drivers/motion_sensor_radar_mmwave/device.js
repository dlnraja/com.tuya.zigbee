'use strict';

const { HybridSensorBase } = require('../../lib/devices');

/**
 * Motion Sensor Radar mmWave Device - v5.3.64 SIMPLIFIED
 */
class MotionSensorRadarDevice extends HybridSensorBase {

  get mainsPowered() { return true; }

  get sensorCapabilities() {
    return ['alarm_motion', 'measure_luminance'];
  }

  get dpMappings() {
    return {
      1: { capability: 'alarm_motion', transform: (v) => v === 1 || v === true },
      2: { capability: 'measure_luminance', divisor: 1 },
      101: { capability: 'alarm_motion', transform: (v) => v === 1 || v === true },
      102: { capability: null }, // Target distance
      103: { capability: null }, // Sensitivity
      104: { capability: null }  // Keep time
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[MMWAVE] ✅ mmWave motion sensor ready');
  }
}

module.exports = MotionSensorRadarDevice;
