'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiCoverDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1': { capability: 'windowcoverings_state', writable: true,
        transform: (v) => {
          if (v === 'open' || v === '0' || v === 0) return 'up';
          if (v === 'close' || v === '2' || v === 2) return 'down';
          return 'idle';
        },
        reverseTransform: (v) => {
          if (v === 'up') return 'open';
          if (v === 'down') return 'close';
          return 'stop';
        } },
      '2': { capability: 'windowcoverings_set', writable: true,
        transform: (v) => v * 100,
        reverseTransform: (v) => Math.round(v) },
      '3': { capability: 'windowcoverings_set',
        transform: (v) => v * 100 },
      '5': { capability: 'unknown' },
      '7': { capability: 'unknown' },
      '12': { capability: 'unknown' },
    };
  }

  async onInit() {
    await super.onInit();
    this.log('[WIFI-COVER] Ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WiFiCoverDevice;

