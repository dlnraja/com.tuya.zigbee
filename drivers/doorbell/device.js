'use strict';
const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

class DoorbellDevice extends UnifiedSensorBase {
  get mainsPowered() { return false; }
  get sensorCapabilities() { return ['alarm_generic', 'measure_battery', 'alarm_tamper']; }
  get dpMappings() {
    return {
      1: { capability: 'alarm_generic', transform: (v) => v === 1 || v === true },
      4: { capability: 'alarm_tamper', transform: (v) => v === 1 || v === true },
      15: { capability: 'measure_battery', divisor: 1 }
    };
  }
  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'ssIasZone',
          attributeName: 'zoneStatus',
          minInterval: 0,
          maxInterval: 3600,
          minChange: 1,
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
    this.log('[DOORBELL]  Ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = DoorbellDevice;
