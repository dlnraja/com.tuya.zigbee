'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

/**
 * Formaldehyde Sensor Device - v5.3.64 SIMPLIFIED
 */
class FormaldehydeSensorDevice extends UnifiedSensorBase {

  get mainsPowered() { return true; }

  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_pm25', 'measure_co2'];
  }

  get dpMappings() {
    return {
      1: { capability: 'measure_temperature', divisor: 10 },
      2: { capability: 'measure_humidity', divisor: 10 },
      18: { capability: 'measure_pm25', divisor: 1 },      // PM2.5
      19: { capability: 'measure_co2', divisor: 1 },       // CO2 ppm
      20: { capability: 'measure_voc', divisor: 1 },       // VOC
      21: { capability: 'unknown' }                              // Formaldehyde (custom)
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
    this._registerCapabilityListeners(); // rule-12a injectedthis.log('[FORMALDEHYDE]  Formaldehyde sensor ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = FormaldehydeSensorDevice;
