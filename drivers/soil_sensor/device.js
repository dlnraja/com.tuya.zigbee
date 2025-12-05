'use strict';

const { HybridSensorBase } = require('../../lib/devices');

/**
 * Soil Sensor Device - v5.4.3 NEW
 *
 * Uses HybridSensorBase for:
 * - Anti-double init
 * - MaxListeners bump
 * - Protocol auto-detection
 * - Phantom sub-device rejection
 * - Automatic ZCL/Tuya DP handling via onTuyaStatus()
 *
 * Supports: Temperature, Humidity, Soil Moisture, Battery
 *
 * KNOWN MODELS:
 * - TS0601 / _TZE284_oitavov2 : Tuya soil moisture sensor
 *
 * Forum: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/
 */
class SoilSensorDevice extends HybridSensorBase {

  /** Battery powered */
  get mainsPowered() { return false; }

  /** Capabilities for soil sensors */
  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  /**
   * v5.4.3: NEW - Complete DP mappings for Soil Sensors
   * Based on forum reports and Z2M data for _TZE284_oitavov2
   *
   * Soil sensors use DIFFERENT DPs than climate sensors:
   * - Climate: DP1=temp, DP2=humidity, DP4=battery
   * - Soil:    DP3=temp, DP5=humidity, DP105=soil_moisture, DP15=battery
   */
  get dpMappings() {
    return {
      // Temperature (DP 3 for soil sensors, NOT DP 1!)
      3: { capability: 'measure_temperature', divisor: 10 },

      // Humidity (DP 5 for soil sensors, NOT DP 2!)
      5: { capability: 'measure_humidity', divisor: 1 },

      // Soil moisture (DP 105) - maps to measure_humidity with custom title
      105: {
        capability: 'measure_humidity',
        divisor: 1,
        transform: (v) => {
          if (v > 100) return Math.round(v / 10);
          return v;
        }
      },

      // Battery (DP 15 or 4)
      15: { capability: 'measure_battery', divisor: 1 },
      4: { capability: 'measure_battery', divisor: 1 },

      // Additional settings
      10: { capability: null, setting: 'max_temp_alarm', divisor: 10 },
      11: { capability: null, setting: 'min_temp_alarm', divisor: 10 },
      12: { capability: null, setting: 'max_humidity_alarm' },
      13: { capability: null, setting: 'min_humidity_alarm' },
      // v5.4.7: REMOVED alarm_generic - NOT a valid Homey capability
      14: { capability: null }, // Alarm state (no valid capability)
      17: { capability: null, setting: 'report_interval' },

      // Fallback DPs
      1: { capability: 'measure_temperature', divisor: 10 },
      2: { capability: 'measure_humidity', divisor: 1 },
      101: { capability: 'measure_humidity', divisor: 1, transform: (v) => v > 100 ? v / 10 : v },
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    const settings = this.getSettings() || {};
    const modelId = settings.zb_modelId || 'unknown';
    const mfr = settings.zb_manufacturerName || 'unknown';

    this.log('[SOIL] ========================================================');
    this.log('[SOIL] Soil sensor ready');
    this.log('[SOIL] Model:', modelId);
    this.log('[SOIL] Manufacturer:', mfr);
    this.log('[SOIL] ========================================================');
    this.log('[SOIL] Watching for temperature/humidity/soil_moisture data...');
  }

  onTuyaStatus(status) {
    this.log('[SOIL] TUYA DATA RECEIVED!');
    this.log('[SOIL] Raw status:', JSON.stringify(status));

    super.onTuyaStatus(status);

    setTimeout(() => {
      const temp = this.getCapabilityValue('measure_temperature');
      const soil = this.getCapabilityValue('measure_humidity'); // Soil moisture uses measure_humidity
      const bat = this.getCapabilityValue('measure_battery');
      this.log('[SOIL] Temperature:', temp !== null ? temp + 'C' : 'waiting...');
      this.log('[SOIL] Soil Moisture:', soil !== null ? soil + '%' : 'waiting...');
      this.log('[SOIL] Battery:', bat !== null ? bat + '%' : 'waiting...');
    }, 100);
  }
}

module.exports = SoilSensorDevice;
