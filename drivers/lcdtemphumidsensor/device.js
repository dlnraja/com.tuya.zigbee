'use strict';

const { HybridSensorBase } = require('../../lib/devices');

/**
 * LCD Temperature & Humidity Sensor Device - v5.4.3
 *
 * For TS0201 LCD display temperature/humidity sensors
 * Manufacturers: _TYZB01_*, _TZ2000_*
 *
 * Uses HybridSensorBase for full ZCL + Tuya DP support
 * Supports: Temperature, Humidity, Battery
 */
class LCDTempHumidSensorDevice extends HybridSensorBase {

  /** Battery powered */
  get mainsPowered() { return false; }

  /** Capabilities for LCD temp/humidity sensors */
  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  /** DP mappings for TS0201 LCD sensors */
  get dpMappings() {
    return {
      // Temperature
      1: { capability: 'measure_temperature', divisor: 10 },
      18: { capability: 'measure_temperature', divisor: 10 },

      // Humidity
      2: { capability: 'measure_humidity', divisor: 1 },

      // Battery (x2 multiplier for half-reporting devices)
      4: { capability: 'measure_battery', divisor: 1, transform: (v) => Math.min(v * 2, 100) },
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    const settings = this.getSettings() || {};
    this.log('[LCD] ✅ LCD Temperature/Humidity Sensor ready');
    this.log('[LCD] Model:', settings.zb_modelId || 'TS0201');
    this.log('[LCD] Manufacturer:', settings.zb_manufacturerName || 'unknown');
  }

  onTuyaStatus(status) {
    this.log('[LCD] 📥 Data received:', JSON.stringify(status));
    super.onTuyaStatus(status);

    setTimeout(() => {
      const temp = this.getCapabilityValue('measure_temperature');
      const hum = this.getCapabilityValue('measure_humidity');
      const bat = this.getCapabilityValue('measure_battery');
      this.log('[LCD] 📊 Temperature:', temp, '°C Humidity:', hum, '% Battery:', bat, '%');
    }, 100);
  }
}

module.exports = LCDTempHumidSensorDevice;
