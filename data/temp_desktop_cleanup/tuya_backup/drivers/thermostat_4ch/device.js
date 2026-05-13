'use strict';
const UnifiedThermostatBase = require('../../lib/devices/UnifiedThermostatBase');

class Thermostat4ChDevice extends UnifiedThermostatBase {
  get mainsPowered() { return true; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[THERMOSTAT-4CH] ✅ Ready');
  }
}
module.exports = Thermostat4ChDevice;
