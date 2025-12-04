'use strict';

const { HybridLightBase } = require('../../lib/devices');

/**
 * RGB Bulb Device - v5.3.64 SIMPLIFIED
 */
class RGBBulbDevice extends HybridLightBase {

  get lightCapabilities() {
    return ['onoff', 'dim', 'light_hue', 'light_saturation'];
  }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'dim', divisor: 1000 },
      5: { capability: 'light_hue', divisor: 360 },        // 0-360 → 0-1
      6: { capability: 'light_saturation', divisor: 1000 }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[BULB] ✅ RGB bulb ready');
  }
}

module.exports = RGBBulbDevice;
