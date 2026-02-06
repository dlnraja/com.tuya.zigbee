'use strict';
const HybridPlugBase = require('../../lib/devices/HybridPlugBase');

class SmartRCBODevice extends HybridPlugBase {
  get plugCapabilities() { return ['onoff', 'measure_power', 'meter_power']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[RCBO] ✅ Ready');
  }
}
module.exports = SmartRCBODevice;
