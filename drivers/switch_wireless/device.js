'use strict';

const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * WIRELESS SWITCH - P127: UnifiedSwitchBase (was bare ZigBeeDevice)
 * - PhysicalButtonMixin for button press detection (ZCL/Tuya)
 * - VirtualButtonMixin + L14 safeSetCapabilityValue pipeline
 */
class SwitchWirelessDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase)) {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      this.buttonCount = 1;
      await super.onNodeInit({ zclNode });
      await this.initVirtualButtons();
      this.log('[WIRELESS-SWITCH] ✅ Universal initialization complete');
    }, 'onNodeInit');
  }

}

module.exports = SwitchWirelessDevice;
