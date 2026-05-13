'use strict';
const UnifiedCoverBase = require('../../lib/devices/UnifiedCoverBase');

class CurtainMotorTiltDevice extends UnifiedCoverBase {
  get coverCapabilities() { return ['windowcoverings_state', 'windowcoverings_set', 'windowcoverings_tilt_set']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[CURTAIN-TILT] ✅ Ready');
  }
}
module.exports = CurtainMotorTiltDevice;
