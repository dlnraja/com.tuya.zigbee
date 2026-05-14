'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const BatteryMixin = require('../../lib/tuya/BatteryMixin');

/**
 * SmartButtonSwitchDevice - v9.5.0 Universal Standard
 * 
 * Migrated to PhysicalButtonMixin for 8-layer detection stack.
 * Standardized battery management via BatteryMixin.
 */
class SmartButtonSwitchDevice extends VirtualButtonMixin(PhysicalButtonMixin(BatteryMixin(ZigBeeDevice))) {

  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      this.buttonCount = 1;
      await super.onNodeInit({ zclNode });
      this.log('[SmartButtonSwitch] ✅ Initialized with Mixin architecture');
    }, 'onNodeInit');
  }

}

module.exports = SmartButtonSwitchDevice;
