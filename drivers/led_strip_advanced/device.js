'use strict';
const HybridLightBase = require('../../lib/devices/HybridLightBase');

class LEDStripAdvancedDevice extends HybridLightBase {
  get lightCapabilities() { return ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature']; }
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
    this.log('[LED-ADV] ✅ Ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = LEDStripAdvancedDevice;
