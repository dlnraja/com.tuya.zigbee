'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * SmartButtonSwitchDevice - v9.5.0 Universal Standard
 * 
 * Migrated to PhysicalButtonMixin for 8-layer detection stack.
 * Standardized battery management via BatteryMixin.
 */
class SmartButtonSwitchDevice extends VirtualButtonMixin(PhysicalButtonMixin(TuyaZigbeeDevice)) {

  // v8.3.0: REMOVED hardcoded mainsPowered getter
  // Battery-powered devices (SNZB-01, SNZB-01P, WB-01) need measure_battery
  // Power detection is handled dynamically by the base class

  async onNodeInit({ zclNode }) {
    // v8.3.0: REMOVED forced battery removal
    // Battery capabilities are handled dynamically by UnifiedBatteryHandler
    // which detects power source at runtime and prunes if mains-powered
    await this._safeInvoke(async () => { this.buttonCount = 1;
      await super.onNodeInit({ zclNode  });
      await this.initVirtualButtons();
      this.log('[SmartButtonSwitch] ✅ Initialized with Mixin architecture');
    }, 'onNodeInit');
  }

}

module.exports = SmartButtonSwitchDevice;
