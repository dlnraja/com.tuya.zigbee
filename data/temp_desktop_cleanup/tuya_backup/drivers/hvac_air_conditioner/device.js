'use strict';
const UnifiedThermostatBase = require('../../lib/devices/UnifiedThermostatBase');

class HVACAirConditionerDevice extends UnifiedThermostatBase {
  get mainsPowered() { return true; }
  get thermostatCapabilities() { return ['onoff', 'target_temperature', 'measure_temperature', 'thermostat_mode']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[AC] ✅ Ready');
  }
}
module.exports = HVACAirConditionerDevice;
