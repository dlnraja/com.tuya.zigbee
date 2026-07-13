'use strict';

const { Driver } = require('homey');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class SmartRemote4ButtonsDriver extends Driver {
  async onInit() {
    this.log('smart_remote_4_buttons driver init');
    registerButtonFlowCards(this, 'smart_remote_4_buttons', 4);
  }
}

module.exports = SmartRemote4ButtonsDriver;
