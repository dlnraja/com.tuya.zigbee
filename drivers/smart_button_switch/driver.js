'use strict';

const { Driver } = require('homey');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class SmartButtonSwitchDriver extends Driver {
  async onInit() {
    this.log('smart_button_switch driver init');
    registerButtonFlowCards(this, 'smart_button_switch', 1);
  }
}

module.exports = SmartButtonSwitchDriver;
