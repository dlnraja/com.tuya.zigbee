'use strict';
const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

class LockSmartDevice extends UnifiedSensorBase {
  get mainsPowered() { return false; }
  get sensorCapabilities() { return ['locked', 'measure_battery', 'alarm_tamper']; }
  get dpMappings() {
    return {
      1: { capability: 'locked', transform: (v) => v === 1 || v === true },
      3: { capability: 'measure_battery', divisor: 1 },
      8: { capability: 'locked', transform: (v) => v === 1 || v === true },
      9: { capability: 'alarm_tamper', transform: (v) => !!v },
      10: { capability: 'measure_battery', divisor: 1 },
      13: { capability: 'alarm_tamper', transform: (v) => !!v },
      35: { capability: 'alarm_tamper', transform: (v) => !!v }
    };
  }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[LOCK] ✅ Ready');
  }
}
module.exports = LockSmartDevice;
