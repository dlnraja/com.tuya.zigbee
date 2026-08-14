'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerGangOnoffFlowCards } = require('../../lib/flow/ActuatorFlowHelper');

class WifiSonoffTx3chDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerGangOnoffFlowCards(this, 'wifi_sonoff_tx_3ch', 3);
  }
}

module.exports = WifiSonoffTx3chDriver;
