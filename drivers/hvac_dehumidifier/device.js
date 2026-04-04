'use strict';
const HybridThermostatBase = require('../../lib/devices/HybridThermostatBase');

class HVACDehumidifierDevice extends HybridThermostatBase {
  get mainsPowered() { return true; }
  get thermostatCapabilities() { return ['onoff', 'dim.humidity', 'measure_humidity']; }
  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'msRelativeHumidity',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 100,
        },
        {
          cluster: 'msTemperatureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        },
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'activePower',
          minInterval: 10,
          maxInterval: 300,
          minChange: 5,
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

    await super.onNodeInit({ zclNode });this.log('[DEHUMIDIFIER] ✅ Ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = HVACDehumidifierDevice;
