'use strict';

const { Driver } = require('homey');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class RemoteButtonEmergencySosDriver extends Driver {
  async onInit() {
    this.log('remote_button_emergency_sos driver init');
    registerButtonFlowCards(this, 'remote_button_emergency_sos', 4);
  }
}

module.exports = RemoteButtonEmergencySosDriver;
