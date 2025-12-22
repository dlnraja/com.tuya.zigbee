'use strict';
const { HybridSwitchBase } = require('../../lib/devices/HybridSwitchBase');

class Switch5GangDevice extends HybridSwitchBase {
  get gangCount() { return 5; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SWITCH-5G] ✅ Ready');
  }
}
module.exports = Switch5GangDevice;
