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

  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    // Auto-fix: Remove battery capabilities for mains-powered devices
    await this.removeCapability('measure_battery').catch(() => {});
    await this.removeCapability('alarm_battery').catch(() => {});
    await this._safeInvoke(async () => { this.buttonCount = 1;
      await super.onNodeInit({ zclNode  });
      await this.initVirtualButtons();
      this.log('[SmartButtonSwitch] ✅ Initialized with Mixin architecture');
    }, 'onNodeInit');
  }

}

module.exports = SmartButtonSwitchDevice;
