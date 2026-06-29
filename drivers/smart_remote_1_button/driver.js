'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class SmartRemote1ButtonDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    registerButtonFlowCards(this, this.id || 'smart_remote_1_button', 1);
    this.log('smart_remote_1_button driver initialized');
  }
}

module.exports = SmartRemote1ButtonDriver;
