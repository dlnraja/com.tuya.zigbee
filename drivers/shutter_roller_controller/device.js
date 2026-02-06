'use strict';
const HybridCoverBase = require('../../lib/devices/HybridCoverBase');

class ShutterRollerDevice extends HybridCoverBase {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SHUTTER] ✅ Ready');
  }
}
module.exports = ShutterRollerDevice;
