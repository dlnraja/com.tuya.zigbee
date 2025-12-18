'use strict';
const { HybridSwitchBase } = require('../../lib/devices/HybridSwitchBase');

class Switch6GangDevice extends HybridSwitchBase {
  get gangCount() { return 6; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SWITCH-6G] ✅ Ready');
  }
}
module.exports = Switch6GangDevice;
