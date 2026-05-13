'use strict';
const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');

class SwitchWirelessDevice extends UnifiedSwitchBase {
  get mainsPowered() { return false; }
  get gangCount() { return 1; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[WIRELESS-SWITCH] ✅ Ready');
  }
}
module.exports = SwitchWirelessDevice;
