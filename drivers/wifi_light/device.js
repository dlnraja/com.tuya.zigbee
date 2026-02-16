'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiLightDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '20': { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '21': { capability: 'light_mode', writable: true,
        transform: (v) => (v === 'white' ? 'temperature' : 'color'),
        reverseTransform: (v) => (v === 'temperature' ? 'white' : 'colour') },
      '22': { capability: 'dim', writable: true,
        transform: (v) => Math.max(0, (v - 10) / 990),
        reverseTransform: (v) => Math.round(v * 990 + 10) },
      '23': { capability: 'light_temperature', writable: true,
        transform: (v) => v / 1000,
        reverseTransform: (v) => Math.round(v * 1000) },
      '24': { capability: null },
      '25': { capability: null },
      '26': { capability: null },
      '32': { capability: null },
    };
  }

  async onInit() {
    await super.onInit();
    this.log('[WIFI-LIGHT] Ready');
  }
}

module.exports = WiFiLightDevice;
