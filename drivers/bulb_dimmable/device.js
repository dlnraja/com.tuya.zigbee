'use strict';

const { HybridLightBase } = require('../../lib/devices');

/**
 * Dimmable Bulb Device - v5.3.64 SIMPLIFIED
 */
class DimmableBulbDevice extends HybridLightBase {

  get lightCapabilities() {
    return ['onoff', 'dim'];
  }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'dim', divisor: 1000, min: 0, max: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[BULB] ✅ Dimmable bulb ready');
  }
}

module.exports = DimmableBulbDevice;
