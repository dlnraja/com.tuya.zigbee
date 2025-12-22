'use strict';
const { HybridSwitchBase } = require('../../lib/devices/HybridSwitchBase');

class Switch4GangDevice extends HybridSwitchBase {
  get gangCount() { return 4; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SWITCH-4G] ✅ Ready');
  }
}
module.exports = Switch4GangDevice;
