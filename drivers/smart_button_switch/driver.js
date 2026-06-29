'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class SmartButtonSwitchDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    registerButtonFlowCards(this, this.id || 'smart_button_switch', 1);
    this.log('smart_button_switch driver initialized');
  }
}

module.exports = SmartButtonSwitchDriver;
