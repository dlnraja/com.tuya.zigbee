'use strict';

const { HybridPlugBase } = require('../../lib/devices');

/**
 * Energy Monitor Plug Device - v5.3.64 SIMPLIFIED
 */
class EnergyMonitorPlugDevice extends HybridPlugBase {

  get plugCapabilities() {
    return ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'];
  }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      17: { capability: 'measure_current', divisor: 1000 },  // mA → A
      18: { capability: 'measure_power', divisor: 10 },      // W * 10
      19: { capability: 'measure_voltage', divisor: 10 },    // V * 10
      20: { capability: 'meter_power', divisor: 100 }        // kWh * 100
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[ENERGY] ✅ Energy monitor plug ready');
  }
}

module.exports = EnergyMonitorPlugDevice;
