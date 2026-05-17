'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiPlugDevice extends TuyaLocalDevice {

  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '9':  { capability: 'unknown' },
      '14': { capability: 'unknown' },
      '15': { capability: 'unknown' },
      '16': { capability: 'unknown' },
      '17': { capability: 'meter_power', divisor: 100 },
      '18': { capability: 'measure_current', divisor: 1000 },
      '19': { capability: 'measure_power', divisor: 10 },
      '20': { capability: 'measure_voltage', divisor: 10 },
      '38': { capability: 'unknown' },
    };
  }

  async onInit() {
    await super.onInit();
    const optCaps = ['measure_current', 'measure_voltage'];
    for (const c of optCaps) {
      if (!this.hasCapability(c)) {
        try { await this.addCapability(c); } catch (e) { /* optional */ }
      }
    }
    this.log('[WIFI-PLUG] Ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WiFiPlugDevice;
