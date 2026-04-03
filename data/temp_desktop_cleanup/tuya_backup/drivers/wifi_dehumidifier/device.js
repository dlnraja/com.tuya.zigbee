'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiDehumidifierDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':  { capability: null }, // mode: auto/manual/dry_clothes/sleep
      '4':  { capability: null }, // fan speed: low/mid/high
      '5':  { capability: 'target_humidity', writable: true },
      '6':  { capability: 'measure_humidity' },
      '7':  { capability: 'measure_temperature' },
      '11': { capability: 'alarm_water', transform: (v) => !!v },
      '12': { capability: null }, // child_lock
      '13': { capability: null }, // anion (ionizer)
      '14': { capability: null }, // countdown
      '101': { capability: null }, // defrost
      '102': { capability: null }, // filter_reset
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
}

module.exports = WiFiDehumidifierDevice;
