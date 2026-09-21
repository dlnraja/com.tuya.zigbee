'use strict';
// A8: NaN Safety - use safeDivide/safeMultiply
// P2647: air quality level / PM0.3 threshold flows (com.tuyalocal Test inspiration)
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
const {
  computeAirQualityLevel,
  crossedAbove,
} = require('../../lib/tuya-local/AirQualityVerdict');

class WiFiAirQualityDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '2':  { capability: 'measure_co2' },
      '18': { capability: 'measure_temperature', smartDivisor: true },
      '19': { capability: 'measure_humidity', smartDivisor: true },
      '20': { capability: 'measure_pm25' },
      '21': { capability: 'measure_voc' },
      '22': { capability: 'measure_formaldehyde', smartDivisor: true },
    };
  }

  async onInit() {
    await super.onInit();
    for (const cap of ['measure_co2', 'measure_temperature', 'measure_humidity', 'measure_pm25']) {
      if (!this.hasCapability(cap)) {
        try { await this.addCapability(cap); } catch (e) { /* optional */ }
      }
    }
    this._aqLevel = this.getStoreValue('aq_level') || null;
    this._lastPm03 = this.getStoreValue('last_pm03');
    this.log('[WIFI-AIR-QUALITY] Ready');
  }

  async safeSetCapabilityValue(capability, value) {
    await super.safeSetCapabilityValue(capability, value);
    if (capability === 'measure_co2' || capability === 'measure_pm25') {
      await this._maybeFireAirQualityLevel();
    }
  }

  async _maybeFireAirQualityLevel() {
    try {
      const co2 = this.getCapabilityValue('measure_co2');
      const pm25 = this.getCapabilityValue('measure_pm25');
      const level = computeAirQualityLevel(co2, pm25);
      const prev = this._aqLevel;
      if (prev && prev === level) return;
      this._aqLevel = level;
      try { await this.setStoreValue('aq_level', level); } catch (_e) { /* soft */ }
      if (!prev) return; // seed — no flow spam on first paint
      await this.triggerFlowCard('wifi_air_quality_level_changed', {
        level,
        previous_level: prev,
      });
    } catch (_e) { /* soft */ }
  }

  /**
   * Optional PM0.3 DP path (when mapped / custom). Fires threshold-cross only.
   * @param {number} raw
   * @param {number} [threshold]
   */
  async notifyPm03(raw, threshold = 1000) {
    const prev = this._lastPm03;
    const next = Number(raw);
    this._lastPm03 = next;
    try { await this.setStoreValue('last_pm03', next); } catch (_e) { /* soft */ }
    if (!crossedAbove(prev, next, threshold)) return;
    await this.triggerFlowCard('wifi_air_quality_pm03_above', { pm03: next }, { threshold });
  }

  async onDeleted() {
    if (this._destroyed) {return;}
    this._destroyed = true;
    this.log('Device deleted, cleaning up');
    await super.onDeleted();
  }
}

module.exports = WiFiAirQualityDevice;
