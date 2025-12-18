'use strict';
const { HybridPlugBase } = require('../../lib/devices/HybridPlugBase');

class SwitchPlug1Device extends HybridPlugBase {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SWITCH-PLUG-1] ✅ Ready');
  }
}
module.exports = SwitchPlug1Device;
