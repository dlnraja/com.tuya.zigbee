'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * WallRemote2GangDevice - v9.5.0 Universal Standard
 * 
 * Migrated to PhysicalButtonMixin for 8-layer detection stack.
 * Standardized battery management via BatteryMixin.
 */
class WallRemote2GangDevice extends PhysicalButtonMixin(ZigBeeDevice) {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { this.buttonCount = 2;
      await super.onNodeInit({ zclNode  });
      this.log('[WallRemote2Gang] ✅ Initialized with Mixin architecture');
    }, 'onNodeInit');
  }

}

module.exports = WallRemote2GangDevice;
