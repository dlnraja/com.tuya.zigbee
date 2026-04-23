'use strict';
const { safeMultiply } = require('../../lib/utils/tuyaUtils.js');

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

/**
 * TUYATEC Temperature & Humidity Sensor Device - v5.4.3
 *
 * For TUYATEC branded temperature/humidity sensors
 * Manufacturers: TUYATEC-*
 *
 * Uses UnifiedSensorBase for full ZCL + Tuya DP support
 * Supports: Temperature, Humidity, Battery
 */
class TuyatecTempHumidSensorDevice extends UnifiedSensorBase {

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
      4: { capability: 'measure_battery', divisor: 1, transform: (v) =>Math.min(100, v * 2) },
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
    // A8: NaN Safety - use safeDivide/safeMultiply
  this.getSettings() || {};
    this.log('[TUYATEC]  TUYATEC Temperature/Humidity Sensor ready');
    this.log('[TUYATEC] Model:', settings.zb_model_id || settings.zb_model_id || 'TUYATEC_TempHumid');
    this.log('[TUYATEC] Manufacturer:', settings.zb_manufacturer_name || settings.zb_manufacturer_name || 'unknown');
  }

  onTuyaStatus(status) {
    this.log('[TUYATEC]  Data received:', JSON.stringify(status));
    super.onTuyaStatus(status);

    setTimeout(() => {
      const temp = this.getCapabilityValue('measure_temperature');
      const hum = this.getCapabilityValue('measure_humidity');
      const bat = this.getCapabilityValue('measure_battery');
      this.log('[TUYATEC]  T:', temp, 'Â°C H:', hum, '% B:', bat, '%');
    }, 100);
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = TuyatecTempHumidSensorDevice;
