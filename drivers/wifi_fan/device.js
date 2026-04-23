'use strict';
const { safeMultiply, safeParse, safeDivide } = require('../../lib/utils/tuyaUtils.js');
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiFanDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':  { capability: '_dp2' },
      '3':  { capability: 'dim', writable: true,
        transform: (v) => Math.max(0, Math.min(1, v * 100)),
        reverseTransform: (v) => Math.round(v * 100) },
      '4':  { capability: '_dp4' },
      '6':  { capability: '_dp6' },
      '8':  { capability: '_dp8' },
      '9':  { capability: 'onoff.light', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '10': { capability: '_dp10' },
      '11': { capability: '_dp11' },
      '12': { capability: '_dp12' },
    };
  }

  async onInit() {
    await super.onInit();
    this.log('[WIFI-FAN] Ready');
  }

  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WiFiFanDevice;
