'use strict';
const { HybridSwitchBase } = require('../../lib/devices/HybridSwitchBase');

class Switch3GangDevice extends HybridSwitchBase {
  get gangCount() { return 3; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SWITCH-3G] ✅ Ready');
  }
}
module.exports = Switch3GangDevice;
