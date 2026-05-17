'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const BatteryMixin = require('../../lib/tuya/BatteryMixin');

/**
 * Button 4 Gang - Handheld Remote / Wall Switch (v9.7.0)
 * 
 * Standardized via Universal Mixin System:
 * - 8-Layer detection for all TS0044/TS004F variants
 * - Cross-layer deduplication
 * - Autonomous Mode Switching (0x8004)
 * - Precision Battery Monitoring
 */
class Button4GangHandheldDevice extends PhysicalButtonMixin(BatteryMixin(ZigBeeDevice)) {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { this.buttonCount = 4;
      // Initialize standard mixins
      await super.onNodeInit({ zclNode  });
      this.log('[BUTTON4-HANDHELD] 🔘 Universal Driver initialization complete');
    }, 'onNodeInit');
  }

}

module.exports = Button4GangHandheldDevice;
