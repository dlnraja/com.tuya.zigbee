'use strict';
const { HybridSwitchBase } = require('../../lib/devices/HybridSwitchBase');

class ModuleMiniSwitchDevice extends HybridSwitchBase {
  get gangCount() { return 1; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[MINI-SWITCH] ✅ Ready');
  }
}
module.exports = ModuleMiniSwitchDevice;
