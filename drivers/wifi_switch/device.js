'use strict';
const { safeDivide } = require('../../lib/utils/tuyaUtils.js');
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiSwitchDevice extends TuyaLocalDevice {

  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '7':  { capability: 'unknown' }, // countdown_1 (seconds)
      '13': { capability: 'unknown' }, // master switch
      '14': { capability: 'unknown' }, // power-on status: off/on/memory
      '15': { capability: 'unknown' }, // indicator: none/relay/pos
      '16': { capability: 'unknown' }, // backlight switch
      '17': { capability: 'unknown' }, // cycle timing
      '18': { capability: 'unknown' }, // random timing
      '19': { capability: 'unknown' }, // inching switch
      '20': { capability: 'measure_power', divisor: 10 },
      '21': { capability: 'measure_current', divisor: 1000 },
      '22': { capability: 'measure_voltage', divisor: 10 },
      '23': { capability: 'meter_power', divisor: 100 },
    };
  }

  async onInit() {
    await super.onInit();
    for (const cap of ['measure_power', 'meter_power', 'measure_current', 'measure_voltage']) {
      if (!this.hasCapability(cap)) {
        try { await this.addCapability(cap); } catch (e) { /* optional */ }
      }
    }
    this.log('[WIFI-SWITCH-1G] Ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WiFiSwitchDevice;
