'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');
const { ClimateInference, BatteryInference } = require('../../lib/IntelligentSensorInference');

/**
 * Climate Sensor Device - v8.0.0 MODERNIZED
 * High-precision temperature and humidity tracking with psychrometric validation.
 */
class ClimateSensorDevice extends UnifiedSensorBase {

  async onNodeInit({ zclNode }) {
    this.log('[CLIMATE] 🚀 v8.0.0 Modernizing...');

    // Initialize specialized climate inference (psychrometric validation)
    this._climateInference = new ClimateInference(this, {
      maxTempJump: 5,
      maxHumidityJump: 15
    });
    
    this._batteryInference = new BatteryInference(this);

    // Parent handles standard sensor logic and v8 discovery initialization
    await super.onNodeInit({ zclNode });

    this.log('[CLIMATE] ✅ Ready');
  }

  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery', 'measure_luminance'];
  }

  get dpMappings() {
    // Device-specific DP overrides for luminance-only sensors
    const mfr = this.getManufacturerName?.() || '';
    if (mfr.includes('AAEASOLL') || mfr.includes('aaeasoll')) {
      return {
        2: { capability: 'measure_luminance', divisor: 1 },
        3: { capability: 'measure_battery', divisor: 1 },
        4: { capability: 'measure_battery', divisor: 1 }
      };
    }

    return {
      1: { capability: 'measure_temperature', smartDivisor: true, useInference: true },
      2: { capability: 'measure_humidity', divisor: 1, useInference: true },
      3: { capability: 'measure_battery', divisor: 1 },
      4: { capability: 'measure_battery', divisor: 1 },
      5: { capability: 'measure_luminance', divisor: 1 },
      12: { capability: 'measure_luminance', divisor: 1 },
      38: { capability: 'measure_temperature.probe', smartDivisor: true, dynamicAdd: true }
    };
  }

  /**
   * Main DP handler using v8 libraries
   */
  onTuyaDP(dpId, value, dpType) {
    this.log(`[CLIMATE] 📥 DP${dpId} = ${value}`);

    const mapping = this.dpMappings[dpId];
    if (mapping) {
      let val;
      if (mapping.smartDivisor === true) {
        const { smartParse } = require('../../lib/managers/SmartDivisorManager');
        val = smartParse(value, dpId, {
          manufacturerName: this.getSetting('zb_manufacturer_name') || '',
          capability: mapping.capability,
          deviceId: this.getData()?.id || '',
        });
      } else {
        val = value / (mapping.divisor || 1);
      }

      if (mapping.capability === 'measure_temperature' || mapping.capability === 'measure_temperature.probe') {
        val = this._climateInference.validateTemperature(val);
      } else if (mapping.capability === 'measure_humidity') {
        val = this._climateInference.validateHumidity(val);
      } else if (mapping.capability === 'measure_battery') {
        val = this._batteryInference.validateBattery(val);
      }

      if (val !== null) {
        return this.setCapabilityValue(mapping.capability, val).catch(() => {});
      }
      return;
    }

    // Fallback to heuristic discovery
    return super.onTuyaDP(dpId, value, dpType);
  }
}

module.exports = ClimateSensorDevice;
