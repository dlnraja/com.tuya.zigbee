'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

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
      this.log('[WIRELESS-SWITCH] [OK] Universal initialization complete');
    }, 'onNodeInit');
  }

}

module.exports = SwitchWirelessDevice;
return module.exports;
});
