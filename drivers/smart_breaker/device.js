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
class SmartBreakerDevice extends VirtualButtonMixin(PhysicalButtonMixin(UnifiedPlugBase)) {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { // v9.7.3: Initialization is orchestrated by the mixin hierarchy.
      // Handles relay control, energy monitoring, and battery status.
      await super.onNodeInit({ zclNode  });
      await this.initVirtualButtons();
      this.log('[BREAKER] ✅ v9.7.3 Universal initialization complete');
    }, 'onNodeInit');
  }

  // v9.7.3: Enhanced DP mappings for circuit breaker specific functions
  get dpMappings() {
    const parentMappings = super.dpMappings || {};
    return {
      ...parentMappings,
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      16: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      9: { capability: 'alarm_generic', transform: (v) => !!v },  // Trip alarm
      26: { capability: 'alarm_generic', transform: (v) => !!v }, // Alternative trip alarm
      17: { capability: 'measure_current', divisor: 1000 },
      20: { capability: 'measure_current', divisor: 1000 },
      18: { capability: 'measure_power', divisor: 1 },
      19: { capability: 'measure_voltage', divisor: 10 },
      101: { capability: 'meter_power', divisor: 100 }
    };
  }

  onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = SmartBreakerDevice;
