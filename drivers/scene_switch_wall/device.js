'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const BatteryMixin = require('../../lib/tuya/BatteryMixin');

/**
 * SceneSwitchWallDevice - v9.5.0 Universal Standard
 * 
 * Migrated to PhysicalButtonMixin for 8-layer detection stack.
 * Standardized battery management via BatteryMixin.
 */
class SceneSwitchWallDevice extends VirtualButtonMixin(PhysicalButtonMixin(BatteryMixin(ZigBeeDevice))) {

  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      this.buttonCount = 2;
      await super.onNodeInit({ zclNode });
      this.log('[SceneSwitchWall] ✅ Initialized with Mixin architecture');
    }, 'onNodeInit');
  }

}

module.exports = SceneSwitchWallDevice;
