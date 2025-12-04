'use strict';
const { HybridLightBase } = require('../../lib/devices');

class DimmerWall1GangDevice extends HybridLightBase {
  get lightCapabilities() { return ['onoff', 'dim']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[DIMMER-1G] ✅ Ready');
  }
}
module.exports = DimmerWall1GangDevice;
