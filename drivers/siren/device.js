'use strict';
const { HybridPlugBase } = require('../../lib/devices');

class SirenDevice extends HybridPlugBase {
  get plugCapabilities() { return ['onoff', 'measure_battery']; }
  get dpMappings() {
    return {
      13: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      15: { capability: 'measure_battery', divisor: 1 }
    };
  }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SIREN] ✅ Ready');
  }
}
module.exports = SirenDevice;
