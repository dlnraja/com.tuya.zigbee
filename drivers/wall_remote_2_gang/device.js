'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/tuya/PhysicalButtonMixin');
const BatteryMixin = require('../../lib/tuya/BatteryMixin');

/**
 * WallRemote2GangDevice - v9.5.0 Universal Standard
 * 
 * Migrated to PhysicalButtonMixin for 8-layer detection stack.
 * Standardized battery management via BatteryMixin.
 */
class WallRemote2GangDevice extends PhysicalButtonMixin(BatteryMixin(ZigBeeDevice)) {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 2;
    await super.onNodeInit({ zclNode });
    
    this.log('[WallRemote2Gang] ✅ Initialized with Mixin architecture');
  }

}

module.exports = WallRemote2GangDevice;
