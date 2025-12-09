'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

/**
 * v5.5.114: Button 1-Gang Driver with flow card registration
 */
class Button1GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Button1GangDriver initialized');
    registerButtonFlowCards(this, 'button_wireless_1', 1);
  }
}

module.exports = Button1GangDriver;
