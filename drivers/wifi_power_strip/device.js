'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiPowerStripDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':  { capability: 'onoff.socket2', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '3':  { capability: 'onoff.socket3', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '4':  { capability: 'onoff.socket4', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '5':  { capability: 'onoff.socket5', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '6':  { capability: 'onoff.socket6', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '7':  { capability: 'onoff.usb', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '9':  { capability: 'unknown' }, // countdown_1
      '14': { capability: 'unknown' }, // power-on behavior
      '17': { capability: 'meter_power', divisor: 100 },
      '18': { capability: 'measure_current', divisor: 1000 },
      '19': { capability: 'measure_power', divisor: 10 },
      '20': { capability: 'measure_voltage', divisor: 10 },
    };
  }

  async onInit() {
    await super.onInit();
    const optCaps = ['onoff.socket2', 'onoff.socket3', 'onoff.socket4', 'onoff.socket5', 'onoff.socket6', 'onoff.usb',
      'measure_power', 'meter_power', 'measure_current', 'measure_voltage'];
    for (const c of optCaps) {
      if (!this.hasCapability(c)) {
        try { await this.addCapability(c); } catch (e) { /* optional */ }
      }
    }
    this.log('[WIFI-POWER-STRIP] Ready (6 sockets + USB + energy)');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WiFiPowerStripDevice;
