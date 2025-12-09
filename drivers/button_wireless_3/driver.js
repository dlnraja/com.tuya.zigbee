'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

/**
 * v5.5.114: Button 3-Gang Driver with flow card registration
 */
class ButtonWireless3GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ButtonWireless3GangDriver initialized');
    registerButtonFlowCards(this, 'button_wireless_3', 3);
  }
}

module.exports = ButtonWireless3GangDriver;
