'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiFanDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':  { capability: null },
      '3':  { capability: 'dim', writable: true,
        transform: (v) => Math.max(0, Math.min(1, safeParse(v, 100))),
        reverseTransform: (v) =>Math.round(safeMultiply(v, 100)) },
      '4':  { capability: null },
      '6':  { capability: null },
      '8':  { capability: null },
      '9':  { capability: 'onoff.light', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '10': { capability: null },
      '11': { capability: null },
      '12': { capability: null },
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
