'use strict';
const HybridThermostatBase = require('../../lib/devices/HybridThermostatBase');

class HVACDehumidifierDevice extends HybridThermostatBase {
  get mainsPowered() { return true; }
  get thermostatCapabilities() { return ['onoff', 'dim.humidity', 'measure_humidity']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    await this.removeCapability('measure_battery').catch(() => {});
    this.log('[DEHUMIDIFIER] ✅ Ready');
  }
}
module.exports = HVACDehumidifierDevice;
