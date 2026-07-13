'use strict';

const { Driver } = require('homey');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class SmartRemote1Button2Driver extends Driver {
  async onInit() {
    this.log('smart_remote_1_button_2 driver init');
    registerButtonFlowCards(this, 'smart_remote_1_button_2', 1);
  }
}

module.exports = SmartRemote1Button2Driver;
