'use strict';

const { SensorBase } = require('../../lib/devices/UnifiedSensorBase');
const BatteryMixin = require('../../lib/tuya/BatteryMixin');

/**
 * Vibration Sensor Device - v8.0.0 MODERNIZED
 * Specialized for vibration, tilt, and tamper detection.
 */
class VibrationSensorDevice extends BatteryMixin(SensorBase) {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_vibration', 'measure_temperature', 'alarm_tamper', 'measure_battery'];
  }

  get dpMappings() {
    return {
      1: { capability: 'alarm_vibration', transform: (v) => v === 1 || v === true },
      2: { capability: 'alarm_tamper', transform: (v) => v === 1 || v === true },
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },
      18: { capability: 'measure_temperature', divisor: 10 },
      19: { capability: 'measure_temperature', divisor: 10 }
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
      const val = mapping.transform ? mapping.transform(value) : (mapping.divisor ? value / mapping.divisor : value);
      if (mapping.capability) {
        return this.safeSetCapabilityValue(mapping.capability, val).catch(() => {});
      }
    }

    // 2. Fallback: Base handles heuristic discovery via this._discovery
    return super.on(dpId, value, dpType);
  }
}

module.exports = VibrationSensorDevice;
