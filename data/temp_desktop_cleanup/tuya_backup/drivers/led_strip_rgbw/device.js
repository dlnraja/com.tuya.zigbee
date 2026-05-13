'use strict';
const UnifiedLightBase = require('../../lib/devices/UnifiedLightBase');

class LEDStripRGBWDevice extends UnifiedLightBase {
  get lightCapabilities() { return ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[LED-RGBW] ✅ Ready');
  }
}
module.exports = LEDStripRGBWDevice;
