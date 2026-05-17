'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const BatteryMixin = require('../../lib/tuya/BatteryMixin');

/**
 * SmartKnobDevice - v9.5.0 Universal Standard
 * 
 * Migrated to PhysicalButtonMixin for 8-layer detection stack including Rotary support.
 * Standardized battery management via BatteryMixin.
 */
class SmartKnobDevice extends PhysicalButtonMixin(BatteryMixin(ZigBeeDevice)) {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { this.buttonCount = 1;
      await super.onNodeInit({ zclNode  });
      this.log('[SmartKnob] ✅ Initialized with Mixin architecture (Rotary enabled)');
    }, 'onNodeInit');
  }

}

module.exports = SmartKnobDevice;
