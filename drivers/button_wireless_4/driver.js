'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

/**
 * v5.5.114: Button 4-Gang Driver with flow card registration
 */
class ButtonWireless4Driver extends ZigBeeDriver {

  async onInit() {
    this.log('ButtonWireless4Driver initialized');
    registerButtonFlowCards(this, 'button_wireless_4', 4);
  }
}

module.exports = ButtonWireless4Driver;
