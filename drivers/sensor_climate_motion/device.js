'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {
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
        transform: (v) => v >= -40 && v <= 80 ? Math.round(v * 10) / 10 : null
      }
    };
  }
}

module.exports = ClimateMotionSensorDevice;
return module.exports;
});
