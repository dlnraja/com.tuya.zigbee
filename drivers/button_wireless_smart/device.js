'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * Button1GangDevice - v9.5.0 Universal Standard
 * (Formerly button_wireless_smart)
 * 
 * Migrated to PhysicalButtonMixin for 8-layer detection stack.
 * Supports Smart Knobs (rotary), HOBEIAN (OnOff Bound), and 0xFD multi-press.
 */
class Button1GangDevice extends PhysicalButtonMixin(ZigBeeDevice) {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      this.buttonCount = 1;
      await super.onNodeInit({ zclNode });
      this.log('[ButtonSmart] ✅ Initialized with Mixin architecture');
    }, 'onNodeInit');
  }

}

module.exports = Button1GangDevice;
