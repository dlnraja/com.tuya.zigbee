'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * RemoteButtonWirelessDevice - v9.5.0 Universal Standard
 * 
 * Migrated to PhysicalButtonMixin for 8-layer detection stack.
 * Standardized battery management via BatteryMixin.
 */
class RemoteButtonWirelessDevice extends PhysicalButtonMixin(ZigBeeDevice) {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { this.buttonCount = 3;
      await super.onNodeInit({ zclNode  });
      this.log('[RemoteButtonWireless] ✅ Initialized with Mixin architecture');
    }, 'onNodeInit');
  }

}

module.exports = RemoteButtonWirelessDevice;
