'use strict';
const HybridThermostatBase = require('../../lib/devices/HybridThermostatBase');

class HVACAirConditionerDevice extends HybridThermostatBase {
  get mainsPowered() { return true; }
  get thermostatCapabilities() { return ['onoff', 'target_temperature', 'measure_temperature', 'thermostat_mode']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    await this.removeCapability('measure_battery').catch(() => {});
    this.log('[AC] ✅ Ready');
  }
}
module.exports = HVACAirConditionerDevice;
