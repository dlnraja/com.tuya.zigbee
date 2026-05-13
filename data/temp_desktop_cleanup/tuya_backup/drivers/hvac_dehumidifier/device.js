'use strict';
const UnifiedThermostatBase = require('../../lib/devices/UnifiedThermostatBase');

class HVACDehumidifierDevice extends UnifiedThermostatBase {
  get mainsPowered() { return true; }
  get thermostatCapabilities() { return ['onoff', 'dim.humidity', 'measure_humidity']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[DEHUMIDIFIER] ✅ Ready');
  }
}
module.exports = HVACDehumidifierDevice;
