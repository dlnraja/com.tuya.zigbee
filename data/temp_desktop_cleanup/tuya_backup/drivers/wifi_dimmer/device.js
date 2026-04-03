'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiDimmerDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1': { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2': { capability: 'dim', writable: true,
        transform: (v) => Math.max(0, (v - 10) / 990),
        reverseTransform: (v) => Math.round(v * 990 + 10) },
      '3': { capability: null },
      '5': { capability: null },
      '7': { capability: null },
      '14': { capability: null },
    };
  }

  async onInit() {
    await super.onInit();
    this.log('[WIFI-DIMMER] Ready');
  }
}

module.exports = WiFiDimmerDevice;
