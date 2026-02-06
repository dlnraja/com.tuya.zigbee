'use strict';
const HybridPlugBase = require('../../lib/devices/HybridPlugBase');

class SwitchPlug2Device extends HybridPlugBase {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SWITCH-PLUG-2] ✅ Ready');
  }
}
module.exports = SwitchPlug2Device;
