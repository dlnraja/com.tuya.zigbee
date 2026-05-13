'use strict';
const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

class DoorbellDevice extends UnifiedSensorBase {
  get mainsPowered() { return false; }
  get sensorCapabilities() { return ['alarm_generic', 'measure_battery', 'alarm_tamper']; }
  get dpMappings() {
    return {
      1: { capability: 'alarm_generic', transform: (v) => v === 1 || v === true },
      4: { capability: 'alarm_tamper', transform: (v) => v === 1 || v === true },
      15: { capability: 'measure_battery', divisor: 1 }
    };
  }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[DOORBELL] ✅ Ready');
  }
}
module.exports = DoorbellDevice;
