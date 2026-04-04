'use strict';
const HybridLightBase = require('../../lib/devices/HybridLightBase');

class CeilingFanDevice extends HybridLightBase {
  get mainsPowered() { return true; }
  get lightCapabilities() { return ['onoff', 'dim']; }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      3: { capability: 'dim', divisor: 100 }, // Fan speed 0-100
      9: { capability: 'onoff.light', transform: (v) => v === 1 }
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

    await super.onNodeInit({ zclNode });this.log('[FAN] ✅ Ready');
  }
}
module.exports = CeilingFanDevice;
