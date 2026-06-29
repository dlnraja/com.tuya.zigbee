'use strict';

const { Driver } = require('homey');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class SmartRemote1ButtonDriver extends Driver {
  async onInit() {
    this.log('smart_remote_1_button driver init');
    registerButtonFlowCards(this, 'smart_remote_1_button', 1);
  }
}

module.exports = SmartRemote1ButtonDriver;
