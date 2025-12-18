'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

/**
 * Vibration Sensor Device - v5.3.64 SIMPLIFIED
 */
class VibrationSensorDevice extends HybridSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_vibration', 'alarm_tamper', 'measure_battery'];
  }

  get dpMappings() {
    return {
      1: { capability: 'alarm_vibration', transform: (v) => v === 1 || v === true },
      2: { capability: 'alarm_tamper', transform: (v) => v === 1 || v === true },
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[VIBRATION] ✅ Vibration sensor ready');
  }
}

module.exports = VibrationSensorDevice;
