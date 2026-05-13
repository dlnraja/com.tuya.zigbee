'use strict';
const UnifiedCoverBase = require('../../lib/devices/UnifiedCoverBase');

class ShutterRollerDevice extends UnifiedCoverBase {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SHUTTER] ✅ Ready');
  }
}
module.exports = ShutterRollerDevice;
