'use strict';
const { HybridSensorBase } = require('../../lib/devices');

class SmokeDetectorAdvancedDevice extends HybridSensorBase {
  get mainsPowered() { return false; }
  get sensorCapabilities() { return ['alarm_smoke', 'measure_battery']; }
  get dpMappings() {
    return {
      1: { capability: 'alarm_smoke', transform: (v) => v === 1 || v === true },
      15: { capability: 'measure_battery', divisor: 1 }
    };
  }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SMOKE-ADV] ✅ Ready');
  }
}
module.exports = SmokeDetectorAdvancedDevice;
