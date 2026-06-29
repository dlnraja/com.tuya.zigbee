'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

function resolveDriverId(driver) {
  return driver?.id || driver?.manifest?.id || 'button_wireless_3';
}

/**
 * v5.5.533: Button 3-Gang Driver - Added await super.onInit()
 * v5.5.114: Original
 */
class ButtonWireless3GangDriver extends BaseZigBeeDriver {

  async onInit() {
    await super.onInit(); // v5.5.533: SDK3 CRITICAL
    const driverId = resolveDriverId(this);
    registerButtonFlowCards(this, driverId, 3);
    this.log(`ButtonWireless3GangDriver v5.5.533 initialized [flows:${driverId}]`);
  }
}

module.exports = ButtonWireless3GangDriver;
