'use strict';
const { HybridSwitchBase } = require('../../lib/devices');

class Switch2GangDevice extends HybridSwitchBase {
  get gangCount() { return 2; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SWITCH-2G] ✅ Ready');
  }
}
module.exports = Switch2GangDevice;
