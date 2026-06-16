'use strict';
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const { containsCI } = require('../../lib/utils/CaseInsensitiveMatcher');

const GARDEN_TIMER_MFRS = ['_tze200_sh1btabb', '_tze200_fphxkxue', '_tze204_sh1btabb', '_tze204_fphxkxue'];

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      SMART WATER VALVE - v9.7.3 UNIVERSAL                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Standardized via Unified Architecture:                                       ║
 * ║  - PhysicalButtonMixin (tuya/v9.7.3) for button sync & dedup                 ║
 * ║  - BatteryMixin (tuya/v9.6.0) for standard battery monitoring                ║
 * ║  - UnifiedPlugBase for core relay logic and Tuya DP/ZCL hybrid support       ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class WaterValveSmartDevice extends VirtualButtonMixin(PhysicalButtonMixin(UnifiedPlugBase)) {
  
  get plugCapabilities() { return ['onoff', 'measure_battery', 'measure_temperature', 'meter_water', 'alarm_water']; }

  get isGardenTimer() {
    if (this._gtCached !== undefined) {return this._gtCached;}
    const mfr = this.getSetting('zb_manufacturer_name') || '';
    this._gtCached = GARDEN_TIMER_MFRS.some(m => containsCI(mfr, m));
    return this._gtCached;
  }

  get dpMappings() {
    const parentMappings = super.dpMappings || {};
    if (this.isGardenTimer) {
      return {
        ...parentMappings,
        1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
        5: { capability: 'meter_water', divisor: 1000 },
        7: { capability: 'measure_battery', transform: (v) => {
          if (v > 100) {return Math.min(100, Math.round(((v - 2000) / 1000) * 100));} // raw mV conversion fallback
          return v;
        }},
        101: { capability: 'meter_water', divisor: 1000 },
      };
    }
    return {
      ...parentMappings,
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: null, internal: 'month_consumption' },
      3: { capability: null, internal: 'daily_consumption' },
      5: { capability: 'meter_water', divisor: 1000 },
      6: { capability: null, internal: 'month_consumption' },
      7: { capability: null, internal: 'daily_consumption' },
      9: { capability: null, internal: 'flow_rate' },
      10: { capability: 'measure_temperature', smartDivisor: true },
      11: { capability: 'measure_battery', transform: (v) => { 
        if (v > 3000) {return 100;}
        if (v < 2700) {return 0;}
        return Math.round(((v - 2700) / 300) * 100);
      }},
      12: { capability: 'alarm_water', transform: (v) => v === 1 || v === true },
      15: { capability: null, setting: 'auto_clean' },
      21: { capability: null, internal: 'flow_rate' },
    };
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { // v9.7.3: Initialization is orchestrated by the mixin hierarchy.
      // Handles battery reporting, physical button detection, and relay logic.
      await super.onNodeInit({ zclNode  });
      await this.initVirtualButtons();
      // Ensure capabilities exist
      if (!this.hasCapability('meter_water')) {await this.addCapability('meter_water').catch (() => { });}
      if (!this.hasCapability('measure_temperature')) {await this.addCapability('measure_temperature').catch(() => { });}
      if (!this.hasCapability('alarm_water')) {await this.addCapability('alarm_water').catch(() => {});}
      if (this.hasCapability('alarm_motion')) {await this.removeCapability('alarm_motion').catch(() => {});}
      this.log(`[WATER-VALVE] ✅ v9.7.3 Ready (${this.isGardenTimer ? 'GARDEN' : 'METERED'})`);
    }, 'onNodeInit');
  }

  /**
   * Action card helper called from driver
   */
  async setValve(value) {
    this.log('[WATER-VALVE] setValve called with:', value);
    return this.triggerCapabilityListener('onoff', !!value);
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
        const triggerId = value ? 'water_valve_smart_opened' : 'water_valve_smart_closed';
        this.log(`[WATER-VALVE] onoff: ${oldValue} -> ${value}, flow: ${triggerId}`);
        this._safeTriggerFlow(triggerId, {}, { capability, oldValue, value });
      } else if (capability === 'alarm_water') {
        const triggerId = value ? 'water_valve_smart_leak_detected' : 'water_valve_smart_leak_cleared';
        this.log(`[WATER-VALVE] alarm_water: ${oldValue} -> ${value}, flow: ${triggerId}`);
        this._safeTriggerFlow(triggerId, {}, { capability, oldValue, value });
      } else if (capability === 'measure_battery') {
        this.log(`[WATER-VALVE] Battery: ${oldValue} -> ${value}`);
        const lowThreshold = this.getSetting('battery_low_threshold') || 20;
        if (typeof value === 'number' && value < lowThreshold && (oldValue === null || oldValue >= lowThreshold)) {
          this.log(`[WATER-VALVE] ⚠️ Low battery (${value}%), triggering alert`);
          this._safeTriggerFlow('water_valve_smart_battery_low', {}, { capability, value, threshold: lowThreshold });
        }
      } else if (capability === 'measure_temperature') {
        this.log(`[WATER-VALVE] Temperature: ${oldValue} -> ${value}`);
        this._safeTriggerFlow('water_valve_smart_temperature_changed', { temperature: value }, { capability, oldValue, value });
        if (typeof value === 'number' && value < 4) {
          this.log(`[WATER-VALVE] 🥶 Frost warning (${value}°C)`);
          this._safeTriggerFlow('water_valve_smart_frost_warning', {}, { capability, value });
        }
      } else if (capability === 'meter_water') {
        this.log(`[WATER-VALVE] Water consumed: ${oldValue} -> ${value}`);
        this._safeTriggerFlow('water_valve_smart_water_consumed', { liters: value }, { capability, oldValue, value });
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
        this.log(`[WATER-VALVE] ⚠️ Cannot trigger flow '${triggerId}': homey.flow unavailable`);
        return Promise.resolve();
      }
      const triggerCard = this.homey.flow.getDeviceTriggerCard(triggerId);
      if (typeof triggerCard?.trigger !== 'function') {
        this.log(`[WATER-VALVE] ⚠️ Flow '${triggerId}' trigger method unavailable`);
        return Promise.resolve();
      }
      return triggerCard.trigger(this, tokens, {}).catch(err => {
        this.error(`[WATER-VALVE] Flow '${triggerId}' failed: ${err.message}`);
      });
    } catch (err) {
      this.error(`[WATER-VALVE] _safeTriggerFlow('${triggerId}') exception: ${err.message}`);
      return Promise.resolve();
    }
  }

  onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WaterValveSmartDevice;
