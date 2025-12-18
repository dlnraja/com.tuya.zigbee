'use strict';
const { HybridThermostatBase } = require('../../lib/devices/HybridThermostatBase');

class SmartHeaterDevice extends HybridThermostatBase {
  get mainsPowered() { return true; }
  get thermostatCapabilities() { return ['onoff', 'target_temperature', 'measure_temperature']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[HEATER] ✅ Ready');
  }
}
module.exports = SmartHeaterDevice;
