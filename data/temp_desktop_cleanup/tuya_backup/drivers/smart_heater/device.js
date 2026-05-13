'use strict';
const UnifiedThermostatBase = require('../../lib/devices/UnifiedThermostatBase');

class SmartHeaterDevice extends UnifiedThermostatBase {
  get mainsPowered() { return true; }
  get thermostatCapabilities() { return ['onoff', 'target_temperature', 'measure_temperature']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[HEATER] ✅ Ready');
  }
}
module.exports = SmartHeaterDevice;
