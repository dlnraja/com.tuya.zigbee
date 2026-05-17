'use strict';
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');


const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const BatteryMixin = require('../../lib/tuya/BatteryMixin');
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
class WaterValveSmartDevice extends VirtualButtonMixin(PhysicalButtonMixin(BatteryMixin(UnifiedPlugBase))) {
  
  get plugCapabilities() { return ['onoff', 'measure_battery', 'measure_temperature', 'meter_water']; }

  get isGardenTimer() {
    if (this._gtCached !== undefined) return this._gtCached;
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
        7: { capability: 'measure_battery' },
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
      10: { capability: 'measure_temperature', divisor: 10 },
      11: { capability: 'measure_battery', transform: async (v) => { if (v > 3000) return 100;
        if (v < 2700) return 0;
        return Math.round(((v - 2700) / 300) * 100);
      }},
      15: { capability: null, setting: 'auto_clean' },
      21: { capability: null, internal: 'flow_rate' },
    };
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { // v9.7.3: Initialization is orchestrated by the mixin hierarchy.
      // Handles battery reporting, physical button detection, and relay logic.
      await super.onNodeInit({ zclNode  });
      // Ensure capabilities exist
      if (!this.hasCapability('meter_water')) await this.addCapability('meter_water').catch (() => { });
      if (!this.hasCapability('measure_temperature')) await this.addCapability('measure_temperature').catch(() => { });
      if (this.hasCapability('alarm_motion')) await this.removeCapability('alarm_motion').catch(() => {});
      this.log(`[WATER-VALVE] ✅ v9.7.3 Ready (${this.isGardenTimer ? 'GARDEN' : 'METERED'})`);
    }, 'onNodeInit');
  }

  onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WaterValveSmartDevice;
