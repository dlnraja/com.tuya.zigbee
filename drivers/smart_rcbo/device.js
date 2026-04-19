'use strict';
const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');

class SmartRCBODevice extends UnifiedPlugBase {
  get plugCapabilities() { return ['onoff', 'measure_power', 'meter_power']; }
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
          attributeName: 'rmsCurrent',
          minInterval: 30,
          maxInterval: 600,
          minChange: 10,
        },
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'rmsVoltage',
          minInterval: 30,
          maxInterval: 600,
          minChange: 1,
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
    this.log('[RCBO]  Ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = SmartRCBODevice;
