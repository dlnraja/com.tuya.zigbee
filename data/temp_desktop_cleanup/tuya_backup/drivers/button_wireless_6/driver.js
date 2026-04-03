'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

/**
 * v5.5.533: Button 6-Gang Driver - Added await super.onInit()
 * v5.5.114: Original
 */
class ButtonWireless6Driver extends ZigBeeDriver {

  async onInit() {
    await super.onInit(); // v5.5.533: SDK3 CRITICAL
    this.log('ButtonWireless6Driver v5.5.533 initialized');
    registerButtonFlowCards(this, 'button_wireless_6', 6);
  }
}

module.exports = ButtonWireless6Driver;
