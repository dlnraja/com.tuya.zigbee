'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiHumidifierDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':  { capability: null },
      '3':  { capability: null },
      '4':  { capability: null },
      '6':  { capability: 'measure_humidity' },
      '7':  { capability: 'measure_temperature', divisor: 10 },
      '11': { capability: null },
      '12': { capability: null },
      '13': { capability: null },
      '14': { capability: 'alarm_water' },
      '15': { capability: null },
      '101': { capability: null },
    };
  }

  async onInit() {
    await super.onInit();
    for (const cap of ['measure_temperature', 'alarm_water']) {
      if (!this.hasCapability(cap)) {
        try { await this.addCapability(cap); } catch (e) { /* optional */ }
      }
    }
    this.log('[WIFI-HUMIDIFIER] Ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WiFiHumidifierDevice;
