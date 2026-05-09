'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

/**
 * v5.5.533: Button 4-Gang Driver - Added await super.onInit()
 * v5.5.114: Original
 */
class ButtonWireless4Driver extends ZigBeeDriver {

  async onInit() {
    await super.onInit(); // v5.5.533: SDK3 CRITICAL
    this.log('ButtonWireless4Driver v5.5.533 initialized');
    registerButtonFlowCards(this, 'button_wireless_4', 4);
  }
}

module.exports = ButtonWireless4Driver;
