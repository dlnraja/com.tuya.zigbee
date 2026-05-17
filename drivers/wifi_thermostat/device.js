'use strict';
// A8: NaN Safety - use safeDivide/safeMultiply
  require('../../lib/tuya-local/TuyaLocalDevice');

const MODE_MAP = { 0: 'off', 1: 'heat', 2: 'auto', 3: 'eco' };
const MODE_REV = { off: 0, heat: 1, auto: 2, eco: 3 };

class WiFiThermostatDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':  { capability: 'target_temperature', writable: true, divisor: 10 },
      '3':  { capability: 'measure_temperature', divisor: 10 },
      '4':  { capability: 'thermostat_mode', writable: true,
        transform: (v) => {
          if (typeof v === 'string') return MODE_MAP[Object.keys(MODE_REV).indexOf(v)] || v;
          return MODE_MAP[v] || 'heat';
        },
        reverseTransform: (v) => MODE_REV[v] !== undefined ? MODE_REV[v] : 1 },
      '5':  { capability: 'unknown' }, // system mode
      '12': { capability: 'unknown' }, // child_lock
      '13': { capability: 'unknown' }, // fault
      '14': { capability: 'measure_temperature.floor', divisor: 10 },
      '15': { capability: 'unknown' }, // max_temp
      '19': { capability: 'unknown' }, // temp_correction
      '24': { capability: 'measure_humidity' },
      '36': { capability: 'unknown' }, // schedule
      '40': { capability: 'unknown' }, // valve state
      '45': { capability: 'unknown' }, // sensor type
      '101': { capability: 'unknown' },
      '102': { capability: 'unknown' },
    };
  }

  async onInit() {
    await super.onInit();
    for (const cap of ['measure_humidity', 'thermostat_mode']) {
      if (!this.hasCapability(cap)) {
        try { await this.addCapability(cap); } catch (e) { /* optional */ }
      }
    }
    this.log('[WIFI-THERMOSTAT] Ready (with modes: off/heat/auto/eco)');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WiFiThermostatDevice;
