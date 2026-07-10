'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * WIRELESS SWITCH - v9.7.3 UNIVERSAL
 * Standardized via Unified Architecture:
 * - PhysicalButtonMixin (tuya/v9.7.3) for button press detection (ZCL/Tuya)
 * - BatteryMixin (tuya/v9.6.0) for standard battery monitoring
 */
class SwitchWirelessDevice extends PhysicalButtonMixin(VirtualButtonMixin(ZigBeeDevice)) {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { this.buttonCount = 1;
      // v9.7.3: Initialization is now orchestrated by Mixins.
      // Handles battery reporting and physical button detection (Single/Double/Long).
      await super.onNodeInit({ zclNode  });
      await this.initVirtualButtons();
      this.log('[WIRELESS-SWITCH] ✅ Universal initialization complete');
    }, 'onNodeInit');
  }

}

module.exports = SwitchWirelessDevice;
