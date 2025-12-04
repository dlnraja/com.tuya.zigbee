'use strict';
const { HybridSwitchBase } = require('../../lib/devices');

class Switch1GangDevice extends HybridSwitchBase {
  get gangCount() { return 1; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SWITCH-1G] ✅ Ready');
  }
}
module.exports = Switch1GangDevice;
