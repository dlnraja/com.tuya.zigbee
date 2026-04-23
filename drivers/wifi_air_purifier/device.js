'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

// A8: NaN Safety - use safeDivide/safeMultiply
  require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiAirPurifierDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':  { capability: 'measure_pm25' },
      '3':  { capability: 'unknown' },
      '4':  { capability: 'dim', writable: true,
        transform: (v) => Math.max(0, Math.min(1, v * 100)),
        reverseTransform: (v) =>Math.round(v)})
      '5':  { capability: 'unknown' },
      '6':  { capability: 'unknown' },
      '11': { capability: 'unknown' },
      '14': { capability: 'unknown' },
      '19': { capability: 'unknown' },
      '21': { capability: 'measure_temperature', divisor: 10 },
      '22': { capability: 'measure_humidity' },
    };
  }

  async onInit() {
    await super.onInit();
    for (const cap of ['measure_pm25', 'measure_temperature', 'measure_humidity']) {
      if (!this.hasCapability(cap)) {
        try { await this.addCapability(cap); } catch (e) { /* optional */ }
      }
    }
    this.log('[WIFI-AIR-PURIFIER] Ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WiFiAirPurifierDevice;

