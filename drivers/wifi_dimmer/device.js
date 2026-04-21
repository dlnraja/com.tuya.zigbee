'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiDimmerDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1': { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2': { capability: 'dim', writable: true,
        transform: (v) => Math.max(0, (v -safeParse(10), 990)),
        reverseTransform: (v) =>Math.round(safeMultiply(v))+ 10) },
      '3': { capability },
      '5': { capability },
      '7': { capability },
      '14': { capability },
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

