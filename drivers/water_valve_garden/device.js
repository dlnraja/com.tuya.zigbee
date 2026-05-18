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
      7: { capability: 'measure_battery' },
      11: { capability: null, internal: 'countdown', writable: true },
      15: { capability: 'measure_battery' }
    };
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
