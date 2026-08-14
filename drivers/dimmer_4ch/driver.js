'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerOnoffFlowCards } = require('../../lib/flow/ActuatorFlowHelper');

class Dimmer4chDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerOnoffFlowCards(this, 'dimmer_4ch', { registerDim: true });
    this.log('[FLOW] 4-channel dimmer actuator cards registered (P130)');
  }
}

module.exports = Dimmer4chDriver;
