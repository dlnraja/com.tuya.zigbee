'use strict';
const { HybridLightBase } = require('../../lib/devices');

class DimmerDualChannelDevice extends HybridLightBase {
  get lightCapabilities() { return ['onoff', 'dim', 'onoff.2', 'dim.2']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[DIMMER-DUAL] ✅ Ready');
  }
}
module.exports = DimmerDualChannelDevice;
