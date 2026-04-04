'use strict';
const HybridThermostatBase = require('../../lib/devices/HybridThermostatBase');

class Thermostat4ChDevice extends HybridThermostatBase {
  get mainsPowered() { return true; }
  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'msTemperatureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    await super.onNodeInit({ zclNode });
    this.log('[THERMOSTAT-4CH] ✅ Ready');
  }
}
module.exports = Thermostat4ChDevice;
