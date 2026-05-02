'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

class MotionContactSensorDevice extends UnifiedSensorBase {
  async onNodeInit({ zclNode }) {
    this._contactState = {
      lastValue: null,
      lastChangeTime: 0,
      timer: null,
      confirmedValue: null
    };
    this._debounceMs = 2000;
    await super.onNodeInit({ zclNode });
  }

  get dpMappings() {
    return {
      1: { capability: 'alarm_contact', transform: (v) => !v },
      3: { capability: 'measure_humidity.soil', divisor: 1 },
      5: {
        capability: 'measure_temperature',
        transform: (v) => (v >= -40 && v <= 80) ? Math.round(v * 10) / 10 : null
      }
    };
  }
}

module.exports = MotionContactSensorDevice;
