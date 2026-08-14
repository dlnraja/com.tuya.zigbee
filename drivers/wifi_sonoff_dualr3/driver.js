'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerGangOnoffFlowCards } = require('../../lib/flow/ActuatorFlowHelper');

class WifiSonoffDualr3Driver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerGangOnoffFlowCards(this, 'wifi_sonoff_dualr3', 2);
  }
}

module.exports = WifiSonoffDualr3Driver;
