'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

function resolveDriverId(driver) {
  return driver?.id || driver?.manifest?.id || 'remote_button_wireless';
}

/**
 * v5.5.533: Button 3-Gang Driver - Added await super.onInit()
 * v5.5.114: Original
 */
class ButtonWireless3GangDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit(); // v5.5.533: SDK3 CRITICAL
    const driverId = resolveDriverId(this);
    registerButtonFlowCards(this, driverId, 3);
    this.log(`ButtonWireless3GangDriver v5.5.533 initialized [flows:${driverId}]`);
  }
}

module.exports = ButtonWireless3GangDriver;
