'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

class ClimateMotionSensorDevice extends UnifiedSensorBase {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Climate Motion Sensor v5.9.12 Ready');
  }

  get dpMappings() {
    return {
      1: { capability: 'alarm_motion', transform: (v) => v === 1 || v === true },
      3: { capability: 'measure_humidity', divisor: 1 },
      5: {
        capability: 'measure_temperature',
        transform: (v) => (v >= -40 && v <= 80) ? Math.round(v * 10) / 10 : null
      }
    };
  }
}

module.exports = ClimateMotionSensorDevice;
