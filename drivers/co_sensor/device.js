'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

/**
 * CO Sensor Device - v5.3.64 SIMPLIFIED
 */
class COSensorDevice extends UnifiedSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_co', 'measure_co', 'measure_battery'];
  }

  get dpMappings() {
    return {
      1: { capability: 'alarm_co', transform: (v) => v === 1 || v === true },
      2: { capability: 'measure_co', divisor: 1 }, // CO concentration ppm
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
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
    this.log('[CO]  CO sensor ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = COSensorDevice;
