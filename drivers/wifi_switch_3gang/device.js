'use strict';
const { safeDivide } = require('../../lib/utils/tuyaUtils.js');
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiSwitch3GangDevice extends TuyaLocalDevice {
  get mainsPowered() { return true; }


  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':  { capability: 'onoff.gang2', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '3':  { capability: 'onoff.gang3', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '7':  { capability: 'countdown_remaining' },
      '8':  { capability: 'countdown_remaining' },
      '9':  { capability: 'countdown_remaining' },
      '13': { capability: 'unknown' }, // master switch
      '14': { capability: 'power_on_behavior', transform: (v) => ({ 0: 'off', 1: 'on', 2: 'previous' }[v] ?? 'previous') },
      '15': { capability: 'unknown' }, // indicator: none/relay/pos
      '16': { capability: 'unknown' }, // backlight switch
      '20': { capability: 'measure_power', smartDivisor: true },
      '21': { capability: 'measure_current', smartDivisor: true },
      '22': { capability: 'measure_voltage', smartDivisor: true },
      '23': { capability: 'meter_power', smartDivisor: true },
    };
  }

  async onInit() {
    await super.onInit();
    for (const cap of ['measure_power', 'meter_power', 'measure_current', 'measure_voltage']) {
      if (!this.hasCapability(cap)) {
        try { await this.addCapability(cap); } catch (e) { /* optional */ }
      }
    }
    this.log('[WIFI-SWITCH-3G] Ready');
  }


  async onDeleted() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.log('Device deleted, cleaning up');
    await super.onDeleted();
  }
}

module.exports = WiFiSwitch3GangDevice;
