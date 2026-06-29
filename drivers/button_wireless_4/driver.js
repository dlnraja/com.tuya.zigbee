'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

function resolveDriverId(driver) {
  return driver?.id || driver?.manifest?.id || 'button_wireless_4';
}

/**
 * v5.5.533: Button 4-Gang Driver - Added await super.onInit()
 * v5.5.114: Original
 */
class ButtonWireless4Driver extends BaseZigBeeDriver {

  async onInit() {
    await super.onInit(); // v5.5.533: SDK3 CRITICAL
    const driverId = resolveDriverId(this);
    registerButtonFlowCards(this, driverId, 4);
    this.log(`ButtonWireless4Driver v5.5.533 initialized [flows:${driverId}]`);
  }
}

module.exports = ButtonWireless4Driver;
