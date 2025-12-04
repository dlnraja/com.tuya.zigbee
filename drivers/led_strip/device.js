'use strict';

const { HybridLightBase } = require('../../lib/devices');

/**
 * LED Strip Device - v5.3.64 SIMPLIFIED
 */
class LEDStripDevice extends HybridLightBase {

  get lightCapabilities() {
    return ['onoff', 'dim', 'light_hue', 'light_saturation'];
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[LED] ✅ LED strip ready');
  }
}

module.exports = LEDStripDevice;
