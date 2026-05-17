'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * SmartRemote4ButtonsDevice - v9.5.0 Universal Standard
 * 
 * Migrated to PhysicalButtonMixin for 8-layer detection stack.
 * Standardized battery management via BatteryMixin.
 */
class SmartRemote4ButtonsDevice extends PhysicalButtonMixin(ZigBeeDevice) {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { this.buttonCount = 4;
      await super.onNodeInit({ zclNode  });
      this.log('[SmartRemote4Buttons] ✅ Initialized with Mixin architecture');
    }, 'onNodeInit');
  }

}

module.exports = SmartRemote4ButtonsDevice;
