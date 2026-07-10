'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

/**
 * v5.5.533: Button 3-Gang Driver - Added await super.onInit()
 * v5.5.114: Original
 */
class ButtonWireless3GangDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit(); // v5.5.533: SDK3 CRITICAL
    this.log('ButtonWireless3GangDriver v5.5.533 initialized');
    registerButtonFlowCards(this, 'remote_button_wireless', 3);
  }
}

module.exports = ButtonWireless3GangDriver;
