'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

/**
 * v5.5.533: Button 8-Gang Driver - Added await super.onInit()
 * v5.5.114: Original
 */
class ButtonWireless8Driver extends ZigBeeDriver {

  async onInit() {
    await super.onInit(); // v5.5.533: SDK3 CRITICAL
    this.log('ButtonWireless8Driver v5.5.533 initialized');
    registerButtonFlowCards(this, 'button_wireless_8', 8);
  }
}

module.exports = ButtonWireless8Driver;
