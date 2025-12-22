'use strict';
const { HybridPlugBase } = require('../../lib/devices/HybridPlugBase');

class PowerMeterDevice extends HybridPlugBase {
  get plugCapabilities() { return ['measure_power', 'meter_power', 'measure_voltage', 'measure_current']; }
  get dpMappings() {
    return {
      17: { capability: 'measure_current', divisor: 1000 },
      18: { capability: 'measure_power', divisor: 10 },
      19: { capability: 'measure_voltage', divisor: 10 },
      20: { capability: 'meter_power', divisor: 100 }
    };
  }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[POWER-METER] ✅ Ready');
  }
}
module.exports = PowerMeterDevice;
