'use strict';
const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');

class SwitchPlug2Device extends UnifiedPlugBase {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SWITCH-PLUG-2] ✅ Ready');
  }
}
module.exports = SwitchPlug2Device;
