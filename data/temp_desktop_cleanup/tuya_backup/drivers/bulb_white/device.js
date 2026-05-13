'use strict';

const UnifiedLightBase = require('../../lib/devices/UnifiedLightBase');

/**
 * White Bulb Device - v5.3.64 SIMPLIFIED
 */
class WhiteBulbDevice extends UnifiedLightBase {

  get lightCapabilities() {
    return ['onoff', 'dim'];
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[BULB] ✅ White bulb ready');
  }
}

module.exports = WhiteBulbDevice;
