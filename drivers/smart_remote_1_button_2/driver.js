'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class SmartRemote1Button2Driver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    registerButtonFlowCards(this, this.id || 'smart_remote_1_button_2', 1);
    this.log('smart_remote_1_button_2 driver initialized');
  }
}

module.exports = SmartRemote1Button2Driver;
