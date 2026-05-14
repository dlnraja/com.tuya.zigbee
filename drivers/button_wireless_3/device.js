'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/tuya/PhysicalButtonMixin');
const BatteryMixin = require('../../lib/tuya/BatteryMixin');

/**
 * Button 3 Gang - Universal Driver (v9.5.0)
 */
class Button3GangDevice extends PhysicalButtonMixin(BatteryMixin(ZigBeeDevice)) {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 3;
    await super.onNodeInit({ zclNode });
    this.log('[BUTTON3] 🔘 Initialized via Universal Mixin System');
  }

}

module.exports = Button3GangDevice;
