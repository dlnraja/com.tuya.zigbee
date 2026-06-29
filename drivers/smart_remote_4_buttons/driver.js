'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class SmartRemote4ButtonsDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    registerButtonFlowCards(this, this.id || 'smart_remote_4_buttons', 4);
    this.log('smart_remote_4_buttons driver initialized');
  }
}

module.exports = SmartRemote4ButtonsDriver;
