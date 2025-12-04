'use strict';

const { HybridLightBase } = require('../../lib/devices');

/**
 * Tunable White Bulb Device - v5.3.64 SIMPLIFIED
 */
class TunableWhiteBulbDevice extends HybridLightBase {

  get lightCapabilities() {
    return ['onoff', 'dim', 'light_temperature'];
  }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'dim', divisor: 1000, min: 0, max: 1 },
      3: { capability: 'light_temperature', divisor: 1000, min: 0, max: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[BULB] ✅ Tunable white bulb ready');
  }
}

module.exports = TunableWhiteBulbDevice;
