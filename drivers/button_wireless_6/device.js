'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * Button6GangDevice - v9.5.0 Universal Standard
 * 
 * Migrated to PhysicalButtonMixin for 8-layer detection stack.
 * Standardized battery management via BatteryMixin.
 */
class Button6GangDevice extends PhysicalButtonMixin(ZigBeeDevice) {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { this.buttonCount = 6;
      await super.onNodeInit({ zclNode  });
      this.log('[Button6Gang] ✅ Initialized with Mixin architecture');
    }, 'onNodeInit');
  }

}

module.exports = Button6GangDevice;
