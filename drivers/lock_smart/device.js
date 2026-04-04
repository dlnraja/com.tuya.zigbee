'use strict';
const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

class LockSmartDevice extends HybridSensorBase {
  get mainsPowered() { return false; }
  get sensorCapabilities() { return ['locked', 'measure_battery', 'alarm_tamper']; }
  get dpMappings() {
    return {
      1: { capability: 'locked', transform: (v) => v === 1 || v === true },
      3: { capability: 'measure_battery', divisor: 1 },
      8: { capability: 'locked', transform: (v) => v === 1 || v === true },
      9: { capability: 'alarm_tamper', transform: (v) => !!v },
      10: { capability: 'measure_battery', divisor: 1 },
      13: { capability: 'alarm_tamper', transform: (v) => !!v },
      35: { capability: 'alarm_tamper', transform: (v) => !!v }
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
    this.log('[LOCK] ✅ Ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = LockSmartDevice;
