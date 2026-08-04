'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');
const { boolean } = require('../../lib/converters/ValueConverterRegistry');
const { safeSetTimeout, safeClearTimeout } = require('../../lib/utils/safe-timers');

/**
 * Vibration Sensor Device - v8.0.0 MODERNIZED
 * Specialized for vibration, tilt, and tamper detection.
 */
class VibrationSensorDevice extends UnifiedSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_vibration', 'measure_temperature', 'alarm_tamper', 'measure_battery'];
  }

  get dpMappings() {
    return {
      1: { capability: 'alarm_vibration', transform: boolean() },
      2: { capability: 'alarm_tamper', transform: boolean() },
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },
      18: { capability: 'measure_temperature', smartDivisor: true },
      19: { capability: 'measure_temperature', smartDivisor: true }
    };
  }

  async onNodeInit({ zclNode }) {
    this.log('[VIBRATION] 🚀 v8.0.0 Modernizing...');
    
    // Parent handles standard sensor logic and discovery initialization (v8)
    await super.onNodeInit({ zclNode });

    // Ensure all capabilities are present
    for (const cap of this.sensorCapabilities) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(() => {});
      }
    }

    this.log('[VIBRATION] ✅ Ready');
  }

  /**
   * Override onTuyaDP to leverage base discovery for unknown DPs
   */
  onTuyaDP(dpId, value, dpType) {
    // 1. Process via static mappings first
    const mapping = this.dpMappings[dpId];
    if (mapping) {
      let val;
      if (mapping.transform) {
        const _xf = typeof mapping.transform === 'object' && typeof mapping.transform.fromDevice === 'function'
          ? mapping.transform.fromDevice : mapping.transform;
        val = _xf(value);
      } else if (mapping.smartDivisor === true) {
        const { smartParse } = require('../../lib/managers/SmartDivisorManager');
        val = smartParse(value, dpId, {
          manufacturerName: this.getSetting('zb_manufacturer_name') || '',
          capability: mapping.capability,
          deviceId: this.getData()?.id || '',
        });
      } else {
        val = mapping.divisor ? value / mapping.divisor : value;
      }
      if (mapping.capability) {
        // v5.12.58 (P92.125): vibration auto-reset — Tuya vibration sensors
        // (TS0210 family) report vibration=true on shock but often NEVER
        // report false. Optional setting `vibration_auto_reset` (seconds,
        // 0 = disabled) returns the alarm to idle after the delay
        // (forum Nicolas #1999).
        return this.safeSetCapabilityValue(mapping.capability, val).then(() => {
          if (mapping.capability === 'alarm_vibration' && val === true) {
            const seconds = Number(this.getSetting?.('vibration_auto_reset')) || 0;
            if (seconds > 0) {
              if (this._vibrationResetTimer) {
                safeClearTimeout(this, this._vibrationResetTimer);
              }
              this._vibrationResetTimer = safeSetTimeout(this, () => {
                if (this._destroyed) { return; }
                this.log(`[VIBRATION] ⏱️ auto-reset to idle after ${seconds}s`);
                this.safeSetCapabilityValue('alarm_vibration', false).catch(() => {});
              }, seconds * 1000);
            }
          }
        }).catch(() => {});
      }
    }

    // 2. Fallback: Base handles heuristic discovery via this._discovery
    return super.onTuyaDP(dpId, value, dpType);
  }
}

module.exports = VibrationSensorDevice;
