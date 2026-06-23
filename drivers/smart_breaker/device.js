'use strict';
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');


const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      SMART CIRCUIT BREAKER - v9.7.3 UNIVERSAL                                ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Standardized via Unified Architecture:                                       ║
 * ║  - BatteryMixin (tuya/v9.6.0) for standard battery monitoring                ║
 * ║  - UnifiedPlugBase for core relay logic, energy monitoring, and              ║
 * ║    Tuya DP/ZCL hybrid support.                                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class SmartBreakerDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedPlugBase)) {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { // v9.7.3: Initialization is orchestrated by the mixin hierarchy.
      // Handles relay control, energy monitoring, and battery status.
      await super.onNodeInit({ zclNode  });
      await this.initVirtualButtons();
      this.log('[BREAKER] ✅ v9.7.3 Universal initialization complete');
    }, 'onNodeInit');
  }

  // v9.7.3: Enhanced DP mappings for circuit breaker specific functions
  // Supports: standard breakers (DP1/16-20/101) + TOWSMR1-40 RCBO (DP1/6-10)
  get dpMappings() {
    const parentMappings = super.dpMappings || {};
    const mfr = (this.getSetting('zb_manufacturer_name') || '').toUpperCase();
    const isTOWSMR1 = mfr.includes('4MA5PUFE');

    // TOWSMR1-40 RCBO uses different DP layout: DP6-8 for energy, DP9=energy, DP10=fault
    if (isTOWSMR1) {
      return {
        ...parentMappings,
        1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
        6: { capability: 'measure_voltage', smartDivisor: true },
        7: { capability: 'measure_current', smartDivisor: true },
        8: { capability: 'measure_power', divisor: 1 },
        9: { capability: 'meter_power', smartDivisor: true },
        10: { capability: 'alarm_generic', transform: (v) => !!v },
      };
    }

    return {
      ...parentMappings,
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      16: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      9: { capability: 'alarm_generic', transform: (v) => !!v },  // Trip alarm
      26: { capability: 'alarm_generic', transform: (v) => !!v }, // Alternative trip alarm
      17: { capability: 'measure_current', smartDivisor: true },
      20: { capability: 'measure_current', smartDivisor: true },
      18: { capability: 'measure_power', divisor: 1 },
      19: { capability: 'measure_voltage', smartDivisor: true },
      101: { capability: 'meter_power', smartDivisor: true }
    };
  }

  onDeleted() {
    super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = SmartBreakerDevice;
