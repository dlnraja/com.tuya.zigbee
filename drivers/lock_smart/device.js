'use strict';
const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

class LockSmartDevice extends HybridSensorBase {
  get mainsPowered() { return false; }
  get sensorCapabilities() { return ['locked', 'measure_battery']; }
  get dpMappings() {
    return {
      1: { capability: 'locked', transform: (v) => v === 1 || v === true },
      3: { capability: 'measure_battery', divisor: 1 }
    };
  }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[LOCK] ✅ Ready');
  }
}
module.exports = LockSmartDevice;
