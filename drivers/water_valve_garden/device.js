'use strict';
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      WATER VALVE GARDEN - v9.7.3 UNIVERSAL                                   ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Standardized via Unified Architecture:                                       ║
 * ║  - PhysicalButtonMixin (tuya/v9.7.3) for button sync & dedup                 ║
 * ║  - BatteryMixin (tuya/v9.6.0) for standard battery monitoring                ║
 * ║  - UnifiedPlugBase for core relay logic and Tuya DP/ZCL hybrid support       ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class WaterValveGardenDevice extends VirtualButtonMixin(PhysicalButtonMixin(UnifiedPlugBase)) {
  
  get plugCapabilities() { return ['onoff', 'measure_battery']; }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { // v9.7.3: Initialization is orchestrated by the mixin hierarchy.
      // Handles battery reporting, physical button detection, and relay logic.
      await super.onNodeInit({ zclNode  });
      await this.initVirtualButtons();
      this.log('[VALVE-GARDEN] ✅ v9.7.3 Universal initialization complete');
    }, 'onNodeInit');
  }

  // v9.7.3: Custom DP mappings for specialized garden valve functions
  get dpMappings() {
    const parentMappings = super.dpMappings || {};
    return {
      ...parentMappings,
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: null, internal: 'work_state' },
      7: { capability: 'measure_battery', transform: (v) => {
        if (v > 100) return Math.min(100, Math.round(((v - 2000) / 1000) * 100)); // raw mV conversion fallback
        return v;
      }},
      11: { capability: null, internal: 'countdown', writable: true },
      15: { capability: 'measure_battery', transform: (v) => {
        if (v > 100) return Math.min(100, Math.round(((v - 2000) / 1000) * 100)); // raw mV conversion fallback
        return v;
      }}
    };
  }

  /**
   * v9.8.0: DEFENSIVE - Safe flow card trigger with null checks
   * Prevents "getDeviceTriggerCard is not a function" runtime errors
   */
  async safeSetCapabilityValue(capability, value) {
    const oldValue = this.getCapabilityValue(capability);
    const res = await super.safeSetCapabilityValue(capability, value);

    if (oldValue !== value) {
      if (capability === 'onoff') {
        const triggerId = value ? 'water_valve_garden_opened' : 'water_valve_garden_closed';
        this.log(`[VALVE-GARDEN] onoff: ${oldValue} -> ${value}, flow: ${triggerId}`);
        this._safeTriggerFlow(triggerId, {}, { capability, oldValue, value });
      } else if (capability === 'measure_battery') {
        this.log(`[VALVE-GARDEN] Battery: ${oldValue} -> ${value}`);
        const lowThreshold = this.getSetting('battery_low_threshold') || 20;
        if (typeof value === 'number' && value < lowThreshold && (oldValue === null || oldValue >= lowThreshold)) {
          this.log(`[VALVE-GARDEN] ⚠️ Low battery (${value}%), triggering alert`);
          this._safeTriggerFlow('water_valve_garden_battery_low', {}, { capability, value, threshold: lowThreshold });
        }
      }
    }
    return res;
  }

  /**
   * v9.8.0: DEFENSIVE - Safe flow card trigger helper
   * Guards against missing homey.flow or triggerCard
   */
  _safeTriggerFlow(triggerId, tokens = {}, debug = {}) {
    try {
      if (!this.homey?.flow) {
        this.log(`[VALVE-GARDEN] ⚠️ Cannot trigger flow '${triggerId}': homey.flow unavailable`);
        return Promise.resolve();
      }
      const triggerCard = this.homey.flow.getDeviceTriggerCard(triggerId);
      if (typeof triggerCard?.trigger !== 'function') {
        this.log(`[VALVE-GARDEN] ⚠️ Flow '${triggerId}' trigger method unavailable`);
        return Promise.resolve();
      }
      return triggerCard.trigger(this, tokens, {}).catch(err => {
        this.error(`[VALVE-GARDEN] Flow '${triggerId}' failed: ${err.message}`);
      });
    } catch (err) {
      this.error(`[VALVE-GARDEN] _safeTriggerFlow('${triggerId}') exception: ${err.message}`);
      return Promise.resolve();
    }
  }

  /**
   * Handle internal state updates from UnifiedPlugBase
   */
  _handleInternalState(key, value) {
    if (key === 'countdown') {
      this.log(`[VALVE-GARDEN] ⏱️ Irrigation countdown active: ${value} seconds`);
      this.emit('irrigation_countdown', value);
    } else if (key === 'work_state') {
      this.log(`[VALVE-GARDEN] ⚙️ Valve work state: ${value}`);
      this.emit('valve_work_state', value);
    }
  }

  onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WaterValveGardenDevice;
