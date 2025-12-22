'use strict';
const { HybridPlugBase } = require('../../lib/devices/HybridPlugBase');

class ValveSingleDevice extends HybridPlugBase {
  get plugCapabilities() { return ['onoff']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[VALVE] ✅ Ready');
  }
}
module.exports = ValveSingleDevice;
