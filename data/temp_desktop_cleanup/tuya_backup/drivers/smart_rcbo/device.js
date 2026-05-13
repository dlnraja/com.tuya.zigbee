'use strict';
const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');

class SmartRCBODevice extends UnifiedPlugBase {
  get plugCapabilities() { return ['onoff', 'measure_power', 'meter_power']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[RCBO] ✅ Ready');
  }
}
module.exports = SmartRCBODevice;
