'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

// P3067: _TZE200_vawy74yh is the Moes ZSS-HM-SSD01 smoke detector (Z2M moes.ts, ZHA tuya_smoke.py,
// blakadder, Hubitat), not a CO sensor: DP1 0 = smoke, DP15 battery %. New pairings go to smoke_sensor;
// devices already paired here keep working: DP1 drives alarm_smoke (added on first report) and never alarm_co.
const SMOKE_ONLY_MFRS = new Set(['_tze200_vawy74yh', '_tze204_vawy74yh', '_tze284_vawy74yh']);
const SMOKE_ONLY_DPS = {
  1: { capability: 'alarm_smoke', transform: (v) => Number(v) === 0, dynamicAdd: true },
  15: { capability: 'measure_battery', divisor: 1 },
};

/**
 * COSensorDevice - v8.0.0
 * Carbon Monoxide sensor implementation using UnifiedSensorBase.
 * Handles alarm_co, measure_co, and battery reporting.
 */
class COSensorDevice extends UnifiedSensorBase {

  /** @override */
  get sensorCapabilities() {
    return ['alarm_co', 'measure_co', 'measure_battery', 'alarm_tamper'];
  }

  /** @override */
  _isSmokeOnly() {
    let mfr = '';
    try { mfr = this.getSetting?.('zb_manufacturer_name') || this.getData?.()?.manufacturerName || ''; } catch (_e) { /* soft */ }
    return SMOKE_ONLY_MFRS.has(String(mfr).toLowerCase());
  }

  get dpMappings() {
    if (this._isSmokeOnly()) { return SMOKE_ONLY_DPS; }
    return {
      1: { capability: 'alarm_co', type: 'bool' },
      2: { capability: 'measure_co', divisor: 1 },
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },
      9: { capability: 'alarm_tamper', type: 'bool' }
    };
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      this.log('[CO] Initializing Carbon Monoxide Sensor...');
      
      // Parent init handles DP listeners, battery handler, and reporting config
      await super.onNodeInit({ zclNode });

      this.log('[CO] ✅ Device ready');
    }, 'onNodeInit');
  }

  /**
   * Handle Tuya DP updates (legacy fallback if UDH fails)
   */
  onTuyaDP(dpId, value, dpType) {
    const mapping = this.dpMappings[dpId];
    if (mapping && mapping.capability) {
      let finalValue = value;
      if (mapping.dynamicAdd && !this.hasCapability(mapping.capability)) {
        this.addCapability(mapping.capability).catch(() => {});
      }
      if (typeof mapping.transform === 'function') {
        finalValue = mapping.transform(value);
      } else if (mapping.smartDivisor === true) {
        const { smartParse } = require('../../lib/managers/SmartDivisorManager');
        finalValue = smartParse(value, dpId, {
          manufacturerName: this.getSetting('zb_manufacturer_name') || '',
          capability: mapping.capability,
          deviceId: this.getData()?.id || '',
        });
      } else if (mapping.divisor) {finalValue = value / mapping.divisor;}

      this.log(`[CO] DP${dpId} → ${mapping.capability}: ${finalValue}`);
      return this.safeSetCapabilityValue(mapping.capability, finalValue).catch(() => {});
    }
    
    this.log(`[CO] Unhandled DP${dpId} [${dpType}] = ${value}`);
  }

}

module.exports = COSensorDevice;
