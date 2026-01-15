'use strict';
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');

class SwitchWirelessDevice extends HybridSwitchBase {
  get mainsPowered() { return false; }
  get gangCount() { return 1; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[WIRELESS-SWITCH] ✅ Ready');
  }
}
module.exports = SwitchWirelessDevice;
