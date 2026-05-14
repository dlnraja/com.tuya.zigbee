'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/tuya/PhysicalButtonMixin');
const BatteryMixin = require('../../lib/tuya/BatteryMixin');

/**
 * Button1GangDevice - v9.5.0 Universal Standard
 * (Formerly button_wireless_smart)
 * 
 * Migrated to PhysicalButtonMixin for 8-layer detection stack.
 * Supports Smart Knobs (rotary), HOBEIAN (OnOff Bound), and 0xFD multi-press.
 */
class Button1GangDevice extends PhysicalButtonMixin(BatteryMixin(ZigBeeDevice)) {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 1;
    await super.onNodeInit({ zclNode });
    
    this.log('[ButtonSmart] ✅ Initialized with Mixin architecture');
  }

}

module.exports = Button1GangDevice;
