'use strict';
const HybridCoverBase = require('../../lib/devices/HybridCoverBase');

class CurtainMotorTiltDevice extends HybridCoverBase {
  get coverCapabilities() { return ['windowcoverings_state', 'windowcoverings_set', 'windowcoverings_tilt_set']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[CURTAIN-TILT] ✅ Ready');
  }
}
module.exports = CurtainMotorTiltDevice;
