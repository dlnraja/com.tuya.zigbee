'use strict';
const HybridPlugBase = require('../../lib/devices/HybridPlugBase');

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
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'activePower',
          minInterval: 10,
          maxInterval: 300,
          minChange: 5,
        },
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'rmsVoltage',
          minInterval: 30,
          maxInterval: 600,
          minChange: 1,
        },
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'rmsCurrent',
          minInterval: 30,
          maxInterval: 600,
          minChange: 10,
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    await super.onNodeInit({ zclNode });
    this.log('[POWER-METER] ✅ Ready');
  }
}
module.exports = PowerMeterDevice;
