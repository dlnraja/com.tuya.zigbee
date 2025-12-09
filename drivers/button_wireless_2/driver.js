'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

/**
 * v5.5.114: Button 2-Gang Driver with flow card registration
 */
class ButtonWireless2GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ButtonWireless2GangDriver initialized');
    registerButtonFlowCards(this, 'button_wireless_2', 2);
  }
}

module.exports = ButtonWireless2GangDriver;
