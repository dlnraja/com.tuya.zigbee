'use strict';
const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');

class PowerMeterDevice extends UnifiedPlugBase {
  // v9.7.3: Standardized Power Meter
  // Inherits hybrid ZCL/Tuya support from UnifiedPlugBase.

  get plugCapabilities() {
    return ['measure_power', 'meter_power', 'measure_voltage', 'measure_current'];
  }

  // P3190: Tuya SPM01V2.5 1P+N meter (_TZE200/_TZE204/_TZE284_iwn0gpzz|TS0601). Z2M/ZHC tuya.ts SPM01V2.5,
  // deCONZ _TZE284_iwn0gpzz_energy_meter.json: DP1 energy /100 kWh, DP102 V /10, DP103 A /1000, DP104 W raw.
  // The meter stops reporting unless polled (Z2M #30506); _TZE200_ needs DP35 enum 1 instead of dataQuery.
  _isSpm01v25() {
    return /^_tze(200|204|284)_iwn0gpzz$/.test(String(this.getSetting('zb_manufacturer_name') || '').toLowerCase());
  }

  get dpMappings() {
    if (this._isSpm01v25()) {
      return {
        1: { capability: 'meter_power', divisor: 100 },
        102: { capability: 'measure_voltage', divisor: 10 },
        103: { capability: 'measure_current', divisor: 1000 },
        104: { capability: 'measure_power', divisor: 1 }
      };
    }
    return {
      17: { capability: 'measure_current', smartDivisor: true },
      18: { capability: 'measure_power', smartDivisor: true },
      19: { capability: 'measure_voltage', smartDivisor: true },
      20: { capability: 'meter_power', smartDivisor: true }
    };
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { // v9.7.3: Unified initialization
      await super.onNodeInit({ zclNode  });
      if (this._isSpm01v25()) {this._startSpm01Poll();}
      this.log('[POWER-METER] ✅ v9.7.3 Standardized initialization complete');
    }, 'onNodeInit');
  }

  async _spm01Query() {
    const mfr = String(this.getSetting('zb_manufacturer_name') || '').toLowerCase();
    try {
      if (mfr.startsWith('_tze200_') && typeof this.sendTuyaCommand === 'function') {
        await this.sendTuyaCommand(35, 1, 'enum');
      } else if (typeof this._sendInitialDataQuery === 'function') {
        await this._sendInitialDataQuery();
      }
    } catch (e) { this.log('[POWER-METER] SPM01 poll failed:', e && e.message); }
  }

  _startSpm01Poll() {
    if (this._spm01Timer) {return;}
    const sec = Math.max(30, Math.min(3600, Number(this.getSetting('spm01_poll_s')) || 60));
    this._spm01Timer = this.homey.setInterval(() => { if (!this._destroyed) {this._spm01Query();} }, sec * 1000);
  }

  _stopSpm01Poll() {
    if (this._spm01Timer) { this.homey.clearInterval(this._spm01Timer); this._spm01Timer = null; }
  }

  async onUninit() {
    this._stopSpm01Poll();
    if (super.onUninit) {await super.onUninit();}
  }

  onDeleted() {
    this._stopSpm01Poll();
    super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = PowerMeterDevice;
