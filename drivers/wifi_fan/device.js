'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiFanDevice extends TuyaLocalDevice {

  // v9.0.74: This device is mains-powered. Declare it so UnifiedBatteryHandler
  // does not add a false measure_battery capability (fixes false-battery reports).
  get mainsPowered() { return true; }

  _getFanSpeedRange() {
    const min = Number(this.getSetting?.('fan_speed_min'));
    const max = Number(this.getSetting?.('fan_speed_max'));
    if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
      return { min, max };
    }
    return { min: 0, max: 100 };
  }

  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':  { capability: null },
      '3':  { capability: 'dim', writable: true,
        transform: (v) => {
          const val = Number(v);
          if (!Number.isFinite(val)) return 0;
          const { min, max } = this._getFanSpeedRange();
          return Math.max(0, Math.min(1, (val - min) / (max - min)));
        },
        reverseTransform: (v) => {
          const val = Number(v);
          const { min, max } = this._getFanSpeedRange();
          if (!Number.isFinite(val)) return min;
          return Math.round(min + (Math.max(0, Math.min(1, val)) * (max - min)));
        } },
      '4':  { capability: null },
      '6':  { capability: null },
      '8':  { capability: null },
      '9':  { capability: 'onoff.light', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '10': { capability: null },
      '11': { capability: null },
      '12': { capability: null },
    };
  }

  async onInit() {
    await super.onInit();
    this.log('[WIFI-FAN] Ready');
  }


  async onDeleted() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.log('Device deleted, cleaning up');
    await super.onDeleted();
  }
}

module.exports = WiFiFanDevice;
