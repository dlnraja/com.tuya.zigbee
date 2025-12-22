'use strict';
const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

class GasDetectorDevice extends HybridSensorBase {
  get mainsPowered() { return true; }
  get sensorCapabilities() { return ['alarm_gas']; }
  get dpMappings() {
    return {
      1: { capability: 'alarm_gas', transform: (v) => v === 1 || v === true }
    };
  }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[GAS-DETECTOR] ✅ Ready');
  }
}
module.exports = GasDetectorDevice;
