'use strict';

const { HybridLightBase } = require('../../lib/devices');

/**
 * RGBW Bulb Device - v5.3.64 SIMPLIFIED
 */
class RGBWBulbDevice extends HybridLightBase {

  get lightCapabilities() {
    return ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode'];
  }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'dim', divisor: 1000 },
      3: { capability: 'light_temperature', divisor: 1000 },
      5: { capability: 'light_hue', divisor: 360 },
      6: { capability: 'light_saturation', divisor: 1000 }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[BULB] ✅ RGBW bulb ready');
  }
}

module.exports = RGBWBulbDevice;
