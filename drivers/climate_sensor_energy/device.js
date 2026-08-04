'use strict';
const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');

class EnergyMeter3PhaseDevice extends UnifiedPlugBase {
  get plugCapabilities() { return ['measure_power', 'meter_power', 'measure_voltage', 'measure_current']; }

  /**
   * EXTEND parent dpMappings with energy monitoring DPs
   */
  get dpMappings() {
    const parentMappings = Object.getPrototypeOf(this).dpMappings || {};
    return {
      ...parentMappings,
      17: { capability: 'measure_current', smartDivisor: true },   // mA → A
      18: { capability: 'measure_power', smartDivisor: true },     // W * 10
      19: { capability: 'measure_voltage', smartDivisor: true },   // V * 10
      20: { capability: 'meter_power', smartDivisor: true }        // kWh * 100
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
    this.log('[ENERGY-3PH]  Ready');
  }


  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}
module.exports = EnergyMeter3PhaseDevice;
