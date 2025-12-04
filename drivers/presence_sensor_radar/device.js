'use strict';

const { HybridSensorBase } = require('../../lib/devices');

/**
 * Presence Sensor (Radar/mmWave) Device - v5.3.64 SIMPLIFIED
 */
class PresenceSensorRadarDevice extends HybridSensorBase {

  get mainsPowered() { return true; } // Radar sensors need power

  get sensorCapabilities() {
    return ['alarm_motion', 'measure_luminance'];
  }

  get dpMappings() {
    return {
      1: { capability: 'alarm_motion', transform: (v) => v === 1 || v === true },
      2: { capability: 'measure_luminance', divisor: 1 },
      9: { capability: null },  // Sensitivity
      10: { capability: null }, // Detection distance
      101: { capability: null }, // Presence status
      102: { capability: null }, // Target distance
      103: { capability: null }, // Illuminance threshold
      104: { capability: null }  // Fading time
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[RADAR] ✅ Radar presence sensor ready');
  }
}

module.exports = PresenceSensorRadarDevice;
