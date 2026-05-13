'use strict';

const UnifiedLightBase = require('../../lib/devices/UnifiedLightBase');

/**
 * LED Controller RGB Device - v5.3.64 SIMPLIFIED
 */
class LEDControllerRGBDevice extends UnifiedLightBase {

  get lightCapabilities() {
    return ['onoff', 'dim', 'light_hue', 'light_saturation'];
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[LED-RGB] ✅ LED controller RGB ready');
  }
}

module.exports = LEDControllerRGBDevice;
