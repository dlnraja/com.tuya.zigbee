'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/tuya/PhysicalButtonMixin');
const BatteryMixin = require('../../lib/tuya/BatteryMixin');

/**
 * Button6GangDevice - v9.5.0 Universal Standard
 * 
 * Migrated to PhysicalButtonMixin for 8-layer detection stack.
 * Standardized battery management via BatteryMixin.
 */
class Button6GangDevice extends PhysicalButtonMixin(BatteryMixin(ZigBeeDevice)) {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 6;
    await super.onNodeInit({ zclNode });
    
    this.log('[Button6Gang] ✅ Initialized with Mixin architecture');
  }

}

module.exports = Button6GangDevice;
