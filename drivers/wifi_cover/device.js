'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
const {
  detectCoverCommandSet, coverStateFromValue, coverValueFromState,
} = require('../../lib/tuya-local/TuyaDeviceTemplates');

class WiFiCoverDevice extends TuyaLocalDevice {

  // v9.0.74: This device is mains-powered. Declare it so UnifiedBatteryHandler
  // does not add a false measure_battery capability (fixes false-battery reports).
  get mainsPowered() { return true; }

  get dpMappings() {
    return {
      '1': { capability: 'windowcoverings_state', writable: true,
        transform: async (v) => {
          // Learn the device's command vocabulary (open/close/stop, on/off/stop, fz/zz, 1/2/3, ...)
          this._learnCoverCommandSet(v);
          if (this._coverCommandSet) {return coverStateFromValue(v, this._coverCommandSet);}
          if (v === 'open' || v === '0' || v === 0) {return 'up';}
          if (v === 'close' || v === '2' || v === 2) {return 'down';}
          return 'idle';
        },
        reverseTransform: (v) => {
          if (this._coverCommandSet) {return coverValueFromState(v, this._coverCommandSet);}
          if (v === 'up') {return 'open';}
          if (v === 'down') {return 'close';}
          return 'stop';
        } },
      '2': { capability: 'windowcoverings_set', writable: true,
        transform: (v) => v / 100,
        reverseTransform: (v) => Math.round(v * 100) },
      '3': { capability: 'windowcoverings_set',
        transform: (v) => v / 100 },
      '5': { capability: null },
      '7': { capability: null },
      '12': { capability: null },
    };
  }

  _learnCoverCommandSet(value) {
    const next = detectCoverCommandSet(value, this._coverCommandSet || null);
    if (next && next !== this._coverCommandSet) {
      this._coverCommandSet = next;
      this.log(`[WIFI-COVER] Command set detected: ${next}`);
      try { this.setStoreValue('cover_command_set', next).catch(() => {}); } catch (_e) { /* non-critical */ }
    }
  }

  async onInit() {
    try { this._coverCommandSet = this.getStoreValue('cover_command_set') || null; } catch (_e) { /* store not ready */ }
    await super.onInit();
    this.log('[WIFI-COVER] Ready'); }


  async onDeleted() {
    if (this._destroyed) {return;}
    this._destroyed = true;
    this.log('Device deleted, cleaning up');
    await super.onDeleted();
  }
}

module.exports = WiFiCoverDevice;
