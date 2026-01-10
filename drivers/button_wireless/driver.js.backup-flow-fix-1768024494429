'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

/**
 * v5.5.114: Button Wireless Driver with flow card registration
 */
class ButtonWirelessDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ButtonWirelessDriver initialized');
    registerButtonFlowCards(this, 'button_wireless', 1);
  }
}

module.exports = ButtonWirelessDriver;
