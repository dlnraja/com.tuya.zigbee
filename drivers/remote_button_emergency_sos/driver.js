'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class RemoteButtonEmergencySosDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    registerButtonFlowCards(this, this.id || 'remote_button_emergency_sos', 4);
    this.log('remote_button_emergency_sos driver initialized');
  }
}

module.exports = RemoteButtonEmergencySosDriver;
