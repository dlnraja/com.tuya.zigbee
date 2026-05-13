'use strict';
const UnifiedLightBase = require('../../lib/devices/UnifiedLightBase');

class LEDStripAdvancedDevice extends UnifiedLightBase {
  get lightCapabilities() { return ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[LED-ADV] ✅ Ready');
  }
}
module.exports = LEDStripAdvancedDevice;
