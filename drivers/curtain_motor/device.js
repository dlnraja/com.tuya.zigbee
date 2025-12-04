'use strict';
const { HybridCoverBase } = require('../../lib/devices');

class CurtainMotorDevice extends HybridCoverBase {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[CURTAIN] ✅ Ready');
  }
}
module.exports = CurtainMotorDevice;
