'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

class HandheldRemote4ButtonsDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    registerButtonFlowCards(this, this.id || 'handheld_remote_4_buttons', 4);
    this.log('handheld_remote_4_buttons driver initialized');
  }
}

module.exports = HandheldRemote4ButtonsDriver;
