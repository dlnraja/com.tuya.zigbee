'use strict';
const { safeDivide } = require('../../lib/utils/tuyaUtils.js');
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiDehumidifierDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':  { capability: 'unknown' }, // mode: auto/manual/dry_clothes/sleep
      '4':  { capability: 'unknown' }, // fan speed: low/mid/high
      '5':  { capability: 'target_humidity', writable: true },
      '6':  { capability: 'measure_humidity' },
      '7':  { capability: 'measure_temperature' },
      '11': { capability: 'alarm_water', transform: (v) => !!v },
      '12': { capability: 'unknown' }, // child_lock
      '13': { capability: 'unknown' }, // anion (ionizer)
      '14': { capability: 'unknown' }, // countdown
      '101': { capability: 'unknown' }, // defrost
      '102': { capability: 'unknown' }, // filter_reset
    };
  }

  async onInit() {
    await super.onInit();
    for (const cap of ['measure_humidity', 'measure_temperature', 'alarm_water', 'target_humidity']) {
      if (!this.hasCapability(cap)) {
        try { await this.addCapability(cap); } catch (e) { /* optional */ }
      }
    }
    this.log('[WIFI-DEHUMIDIFIER] Ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WiFiDehumidifierDevice;
