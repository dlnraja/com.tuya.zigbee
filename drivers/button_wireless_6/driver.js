'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

/**
 * v5.5.114: Button 6-Gang Driver with flow card registration
 */
class ButtonWireless6Driver extends ZigBeeDriver {

  async onInit() {
    this.log('ButtonWireless6Driver initialized');
    registerButtonFlowCards(this, 'button_wireless_6', 6);
  }
}

module.exports = ButtonWireless6Driver;
