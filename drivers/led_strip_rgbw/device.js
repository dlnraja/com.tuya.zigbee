'use strict';
const { HybridLightBase } = require('../../lib/devices');

class LEDStripRGBWDevice extends HybridLightBase {
  get lightCapabilities() { return ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[LED-RGBW] ✅ Ready');
  }
}
module.exports = LEDStripRGBWDevice;
