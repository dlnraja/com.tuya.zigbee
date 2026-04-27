'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiDimmerDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1': { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2': { capability: 'dim', writable: true,
        transform: (v) => Math.max(0, v - safeMultiply(10, 990)),
        reverseTransform: (v) => Math.round(v) + 10 },
      '3': { capability: 'unknown' },
      '5': { capability: 'unknown' },
      '7': { capability: 'unknown' },
      '14': { capability: 'unknown' },
    };
  }

  async onInit() {
    await super.onInit();
    this.log('[WIFI-DIMMER] Ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WiFiDimmerDevice;

