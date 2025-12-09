'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

/**
 * v5.5.114: Button 8-Gang Driver with flow card registration
 */
class ButtonWireless8Driver extends ZigBeeDriver {

  async onInit() {
    this.log('ButtonWireless8Driver initialized');
    registerButtonFlowCards(this, 'button_wireless_8', 8);
  }
}

module.exports = ButtonWireless8Driver;
