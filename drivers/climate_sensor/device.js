'use strict';

const { HybridSensorBase } = require('../../lib/devices');

/**
 * Climate Sensor Device - v5.3.64 SIMPLIFIED VERSION
 *
 * Uses HybridSensorBase for:
 * - Anti-double init
 * - MaxListeners bump
 * - Protocol auto-detection
 * - Phantom sub-device rejection
 * - Automatic ZCL/Tuya DP handling
 *
 * Supports: Temperature, Humidity, Battery
 */
class ClimateSensorDevice extends HybridSensorBase {

  /** Battery powered */
  get mainsPowered() { return false; }

  /** Capabilities for climate sensors */
  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  /**
   * DP mappings for Tuya EF00 climate sensors
   * Different manufacturers use different DPs
   */
  get dpMappings() {
    return {
      // Most common mappings
      1: { capability: 'measure_temperature', divisor: 10 },
      2: { capability: 'measure_humidity', divisor: 10 },

      // Alternative mappings (some devices)
      3: { capability: 'measure_temperature', divisor: 10 },  // Soil temp
      5: { capability: 'measure_humidity', divisor: 10 },     // Soil moisture

      // Battery
      4: { capability: 'measure_battery', divisor: 1 },
      14: { capability: 'alarm_battery', transform: (v) => v === 1 },
      15: { capability: 'measure_battery', divisor: 1 },

      // Temperature offset (some devices)
      18: { capability: 'measure_temperature', divisor: 10 },
      19: { capability: 'measure_humidity', divisor: 10 }
    };
  }

  async onNodeInit({ zclNode }) {
    // Call base class - handles everything!
    await super.onNodeInit({ zclNode });

    // Log sensor-specific info
    this.log('[CLIMATE] ✅ Climate sensor ready');
    this.log('[CLIMATE] Waiting for temperature/humidity data...');
  }
}

module.exports = ClimateSensorDevice;
