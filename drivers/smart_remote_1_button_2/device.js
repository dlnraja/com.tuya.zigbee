'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * SmartRemote1Button2Device - v9.5.0 Universal Standard
 * 
 * Migrated to PhysicalButtonMixin for 8-layer detection stack.
 * Standardized battery management via BatteryMixin.
 */
class SmartRemote1Button2Device extends PhysicalButtonMixin(ZigBeeDevice) {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { this.buttonCount = 1;
      await super.onNodeInit({ zclNode  });
      this.log('[SmartRemote1Button2] ✅ Initialized with Mixin architecture');
    }, 'onNodeInit');
  }

}

module.exports = SmartRemote1Button2Device;
