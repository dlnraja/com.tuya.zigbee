'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiIRRemoteDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':   { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':   { capability: null },
      '201': { capability: null },
      '202': { capability: null },
    };
  }

  async onInit() {
    await super.onInit();
    this.log('[WIFI-IR-REMOTE] Ready');
  }
}

module.exports = WiFiIRRemoteDevice;
