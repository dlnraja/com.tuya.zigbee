'use strict';
const { HybridThermostatBase } = require('../../lib/devices');

class Thermostat4ChDevice extends HybridThermostatBase {
  get mainsPowered() { return true; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[THERMOSTAT-4CH] ✅ Ready');
  }
}
module.exports = Thermostat4ChDevice;
