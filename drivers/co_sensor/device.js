'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

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
  get dpMappings() {
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
      if (mapping.divisor) finalValue = value / mapping.divisor;
      
      this.log(`[CO] DP${dpId} → ${mapping.capability}: ${finalValue}`);
      return this.safeSetCapabilityValue(mapping.capability, finalValue).catch(() => {});
    }
    
    this.log(`[CO] Unhandled DP${dpId} [${dpType}] = ${value}`);
  }

}

module.exports = COSensorDevice;
