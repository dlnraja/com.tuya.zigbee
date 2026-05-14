'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/tuya/PhysicalButtonMixin');
const BatteryMixin = require('../../lib/tuya/BatteryMixin');

/**
 * RemoteButtonWirelessDevice - v9.5.0 Universal Standard
 * 
 * Migrated to PhysicalButtonMixin for 8-layer detection stack.
 * Standardized battery management via BatteryMixin.
 */
class RemoteButtonWirelessDevice extends PhysicalButtonMixin(BatteryMixin(ZigBeeDevice)) {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 3;
    await super.onNodeInit({ zclNode });
    
    this.log('[RemoteButtonWireless] ✅ Initialized with Mixin architecture');
  }

}

module.exports = RemoteButtonWirelessDevice;
