'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
const { handleDp17 } = require('../../lib/tuya-local/Dp17EnergyHandler');

class WiFiPlugDevice extends TuyaLocalDevice {
  get mainsPowered() { return true; }


  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '9':  { capability: 'unknown' },
      '14': { capability: 'unknown' },
      '15': { capability: 'unknown' },
      '16': { capability: 'unknown' },
      // P2705: DP17 handled by Dp17EnergyHandler (auto-detect incremental Wh vs cumulative)
      '17': { capability: null },
      '18': { capability: 'measure_current', smartDivisor: true },
      '19': { capability: 'measure_power', smartDivisor: true },
      '20': { capability: 'measure_voltage', smartDivisor: true },
      '38': { capability: 'unknown' },
    };
  }

  async onInit() {
    await super.onInit();
    const optCaps = ['measure_current', 'measure_voltage'];
    for (const c of optCaps) {
      if (!this.hasCapability(c)) {
        try { await this.addCapability(c); } catch (e) { /* optional */ }
      }
    }
    this.log('[WIFI-PLUG] Ready');
  }


  async onDeleted() {
    if (this._destroyed) {return;}
    this._destroyed = true;
    this.log('Device deleted, cleaning up');
    await super.onDeleted();
  }

  /** P2705: DP17 energy — per-device auto-detection, meter never drops */
  async _processDPUpdate(dps) {
    await super._processDPUpdate(dps);
    try { await handleDp17(this, dps); } catch (e) { this.error('[DP17] energy handling failed:', e.message); }
  }
}

module.exports = WiFiPlugDevice;
