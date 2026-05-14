'use strict';

const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const BatteryMixin = require('../../lib/tuya/BatteryMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      VALVE SINGLE - v9.7.3 UNIVERSAL                                         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Standardized via Unified Architecture:                                       ║
 * ║  - PhysicalButtonMixin (tuya/v9.7.3) for physical button sync & dedup        ║
 * ║  - BatteryMixin (tuya/v9.6.0) for battery monitoring (genPowerCfg)           ║
 * ║  - VirtualButtonMixin (mixins/v1.2) for flow-based button triggers           ║
 * ║  - UnifiedPlugBase for core relay logic and Tuya DP/ZCL hybrid support       ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class ValveSingleDevice extends PhysicalButtonMixin(BatteryMixin(VirtualButtonMixin(UnifiedPlugBase))) {
  
  get plugCapabilities() { return ['onoff']; }
  
  get gangCount() { return 1; }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      // v9.7.3: Initialization is orchestrated by the mixin hierarchy.
      // Handles battery reporting, physical button detection, and virtual buttons.
      await super.onNodeInit({ zclNode });
      await this.initVirtualButtons();
      this.log('[VALVE] ✅ Universal initialization complete (v9.7.3)');
    }, 'onNodeInit');
  }

  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = ValveSingleDevice;
