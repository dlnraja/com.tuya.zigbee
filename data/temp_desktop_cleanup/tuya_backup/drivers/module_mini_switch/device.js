'use strict';
const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');

class ModuleMiniSwitchDevice extends UnifiedSwitchBase {
  get gangCount() { return 1; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[MINI-SWITCH] ✅ Ready');
  }
}
module.exports = ModuleMiniSwitchDevice;
