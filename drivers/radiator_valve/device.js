'use strict';
const { HybridThermostatBase } = require('../../lib/devices');

class RadiatorValveDevice extends HybridThermostatBase {
  get mainsPowered() { return false; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[TRV] ✅ Ready');
  }
}
module.exports = RadiatorValveDevice;
