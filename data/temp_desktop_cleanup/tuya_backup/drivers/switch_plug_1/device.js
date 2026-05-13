'use strict';
const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');

class SwitchPlug1Device extends UnifiedPlugBase {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SWITCH-PLUG-1] ✅ Ready');
  }
}
module.exports = SwitchPlug1Device;
