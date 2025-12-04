'use strict';
const { HybridPlugBase } = require('../../lib/devices');

class WaterValveSmartDevice extends HybridPlugBase {
  get plugCapabilities() { return ['onoff', 'measure_battery']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[WATER-VALVE] ✅ Ready');
  }
}
module.exports = WaterValveSmartDevice;
