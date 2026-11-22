'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * +==============================================================================+
 * |      VALVE SINGLE - v9.7.3 UNIVERSAL                                         |
 * +==============================================================================+
 * |  Standardized via Unified Architecture:                                       |
 * |  - PhysicalButtonMixin (tuya/v9.7.3) for physical button sync & dedup        |
 * |  - BatteryMixin (tuya/v9.6.0) for battery monitoring (genPowerCfg)           |
 * |  - VirtualButtonMixin (mixins/v1.2) for flow-based button triggers           |
 * |  - UnifiedPlugBase for core relay logic and Tuya DP/ZCL hybrid support       |
 * +==============================================================================+
 */
class ValveSingleDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedPlugBase)) {
  
  get plugCapabilities() { return ['onoff']; }
  
  get gangCount() { return 1; }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { // v9.7.3: Initialization is orchestrated by the mixin hierarchy.
      // Handles battery reporting, physical button detection, and virtual buttons.
      await super.onNodeInit({ zclNode  });
      await this.initVirtualButtons();
      this.log('[VALVE] [OK] Universal initialization complete (v9.7.3)');
    }, 'onNodeInit');
  }

  onDeleted() {
    super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = ValveSingleDevice;
return module.exports;
});
