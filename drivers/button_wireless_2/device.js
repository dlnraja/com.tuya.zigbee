'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/tuya/PhysicalButtonMixin');
const BatteryMixin = require('../../lib/tuya/BatteryMixin');

/**
 * Button 2 Gang - Universal Driver (v9.5.0)
 */
class Button2GangDevice extends PhysicalButtonMixin(BatteryMixin(ZigBeeDevice)) {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 2;
    await super.onNodeInit({ zclNode });
    this.log('[BUTTON2] 🔘 Initialized via Universal Mixin System');
  }

}

module.exports = Button2GangDevice;
