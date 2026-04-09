'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

/**
 * TUYATEC Temperature & Humidity Sensor Device - v5.4.3
 *
 * For TUYATEC branded temperature/humidity sensors
 * Manufacturers: TUYATEC-*
 *
 * Uses HybridSensorBase for full ZCL + Tuya DP support
 * Supports: Temperature, Humidity, Battery
 */
class TuyatecTempHumidSensorDevice extends HybridSensorBase {

  /** Battery powered */
  get mainsPowered() { return false; }

  /** Capabilities for TUYATEC temp/humidity sensors */
  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  /** DP mappings for TUYATEC sensors */
  get dpMappings() {
    return {
      // Temperature
      1: { capability: 'measure_temperature', divisor: 10 },
      18: { capability: 'measure_temperature', divisor: 10 },

      // Humidity
      2: { capability: 'measure_humidity', divisor: 1 },

      // Battery
      4: { capability: 'measure_battery', divisor: 1, transform: (v) => Math.min(v * 2, 100) },
    };
  }

  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'msTemperatureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        },
        {
          cluster: 'msRelativeHumidity',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 100,
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    await super.onNodeInit({ zclNode });
    this._registerCapabilityListeners(); // rule-12a injected
    const settings = this.getSettings() || {};
    this.log('[TUYATEC] ✅ TUYATEC Temperature/Humidity Sensor ready');
    this.log('[TUYATEC] Model:', settings.zb_model_id || settings.zb_modelId || 'TUYATEC_TempHumid');
    this.log('[TUYATEC] Manufacturer:', settings.zb_manufacturer_name || settings.zb_manufacturerName || 'unknown');
  }

  onTuyaStatus(status) {
    this.log('[TUYATEC] 📥 Data received:', JSON.stringify(status));
    super.onTuyaStatus(status);

    setTimeout(() => {
      const temp = this.getCapabilityValue('measure_temperature');
      const hum = this.getCapabilityValue('measure_humidity');
      const bat = this.getCapabilityValue('measure_battery');
      this.log('[TUYATEC] 📊 T:', temp, '°C H:', hum, '% B:', bat, '%');
    }, 100);
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = TuyatecTempHumidSensorDevice;
