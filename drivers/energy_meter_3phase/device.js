'use strict';
const { HybridPlugBase } = require('../../lib/devices/HybridPlugBase');

class EnergyMeter3PhaseDevice extends HybridPlugBase {
  get plugCapabilities() { return ['measure_power', 'meter_power', 'measure_voltage', 'measure_current']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[ENERGY-3PH] ✅ Ready');
  }
}
module.exports = EnergyMeter3PhaseDevice;
