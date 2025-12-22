'use strict';

const { HybridLightBase } = require('../../lib/devices/HybridLightBase');

/**
 * White Bulb Device - v5.3.64 SIMPLIFIED
 */
class WhiteBulbDevice extends HybridLightBase {

  get lightCapabilities() {
    return ['onoff', 'dim'];
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[BULB] ✅ White bulb ready');
  }
}

module.exports = WhiteBulbDevice;
