'use strict';
const { HybridSwitchBase } = require('../../lib/devices/HybridSwitchBase');

class Switch8GangDevice extends HybridSwitchBase {
  get gangCount() { return 8; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SWITCH-8G] ✅ Ready');
  }
}
module.exports = Switch8GangDevice;
