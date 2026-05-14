'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/tuya/PhysicalButtonMixin');
const BatteryMixin = require('../../lib/tuya/BatteryMixin');

/**
 * WallRemote4Gang3Device - v9.5.0 Universal Standard
 * 
 * Migrated to PhysicalButtonMixin for 8-layer detection stack.
 * Standardized battery management via BatteryMixin.
 */
class WallRemote4Gang3Device extends PhysicalButtonMixin(BatteryMixin(ZigBeeDevice)) {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 4;
    await super.onNodeInit({ zclNode });
    
    this.log('[WallRemote4Gang3] ✅ Initialized with Mixin architecture');
  }

}

module.exports = WallRemote4Gang3Device;
