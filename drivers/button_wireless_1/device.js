'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/tuya/PhysicalButtonMixin');
const BatteryMixin = require('../../lib/tuya/BatteryMixin');

/**
 * Button 1 Gang - Universal Driver (v9.5.0)
 */
class Button1GangDevice extends PhysicalButtonMixin(BatteryMixin(ZigBeeDevice)) {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 1;
    await super.onNodeInit({ zclNode });
    this.log('[BUTTON1] 🔘 Initialized via Universal Mixin System');
  }

}

module.exports = Button1GangDevice;
