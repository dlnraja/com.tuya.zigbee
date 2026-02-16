'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiThermostatDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':  { capability: 'target_temperature', writable: true, divisor: 10 },
      '3':  { capability: 'measure_temperature', divisor: 10 },
      '4':  { capability: null },
      '5':  { capability: null },
      '12': { capability: null },
      '13': { capability: null },
      '14': { capability: 'measure_temperature.floor', divisor: 10 },
      '15': { capability: null },
      '19': { capability: null },
      '24': { capability: 'measure_humidity' },
      '36': { capability: null },
      '40': { capability: null },
      '45': { capability: null },
      '101': { capability: null },
      '102': { capability: null },
    };
  }

  async onInit() {
    await super.onInit();
    for (const cap of ['measure_humidity']) {
      if (!this.hasCapability(cap)) {
        try { await this.addCapability(cap); } catch (e) { /* optional */ }
      }
    }
    this.log('[WIFI-THERMOSTAT] Ready');
  }
}

module.exports = WiFiThermostatDevice;
