'use strict';
const { HybridLightBase } = require('../../lib/devices/HybridLightBase');

class CeilingFanDevice extends HybridLightBase {
  get mainsPowered() { return true; }
  get lightCapabilities() { return ['onoff', 'dim']; }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      3: { capability: 'dim', divisor: 100 }, // Fan speed 0-100
      9: { capability: 'onoff.light', transform: (v) => v === 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[FAN] ✅ Ready');
  }
}
module.exports = CeilingFanDevice;
