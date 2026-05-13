'use strict';

const UnifiedLightBase = require('../../lib/devices/UnifiedLightBase');

/**
 * LED Controller CCT Device - v5.3.64 SIMPLIFIED
 * Fixes issue #83: TS0501B dimming
 */
class LEDControllerCCTDevice extends UnifiedLightBase {

  get lightCapabilities() {
    return ['onoff', 'dim', 'light_temperature'];
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[LED-CCT] ✅ LED controller CCT ready');
  }
}

module.exports = LEDControllerCCTDevice;
