'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerOnoffFlowCards } = require('../../lib/flow/ActuatorFlowHelper');

class Dimmer010vDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerOnoffFlowCards(this, 'dimmer_0_10v', { registerDim: true });
    this.log('[FLOW] 0-10V dimmer actuator cards registered (P130)');
  }
}

module.exports = Dimmer010vDriver;
