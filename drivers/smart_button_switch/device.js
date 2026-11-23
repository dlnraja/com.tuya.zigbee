'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * SmartButtonSwitchDevice - v9.5.0 Universal Standard
 * 
 * Migrated to PhysicalButtonMixin for 8-layer detection stack.
 * Standardized battery management via BatteryMixin.
 */
class SmartButtonSwitchDevice extends PhysicalButtonMixin(VirtualButtonMixin(TuyaZigbeeDevice)) {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { this.buttonCount = 1;
      await super.onNodeInit({ zclNode  });
      await this.initVirtualButtons();
      this.log('[SmartButtonSwitch] [OK] Initialized with Mixin architecture');
    }, 'onNodeInit');
  }

}

module.exports = SmartButtonSwitchDevice;
return module.exports;
});
