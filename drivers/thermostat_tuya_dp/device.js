'use strict';
const { HybridThermostatBase } = require('../../lib/devices');

class ThermostatTuyaDPDevice extends HybridThermostatBase {
  get mainsPowered() { return true; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[THERMOSTAT-DP] ✅ Ready');
  }
}
module.exports = ThermostatTuyaDPDevice;
