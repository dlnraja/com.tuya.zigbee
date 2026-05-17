'use strict';
// A8: NaN Safety - use safeDivide/safeMultiply
  require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiHumidifierDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':  { capability: 'unknown' },
      '3':  { capability: 'unknown' },
      '4':  { capability: 'unknown' },
      '6':  { capability: 'measure_humidity' },
      '7':  { capability: 'measure_temperature', divisor: 10 },
      '11': { capability: 'unknown' },
      '12': { capability: 'unknown' },
      '13': { capability: 'unknown' },
      '14': { capability: 'alarm_water' },
      '15': { capability: 'unknown' },
      '101': { capability: 'unknown' },
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
