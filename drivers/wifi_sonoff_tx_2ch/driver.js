'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerGangOnoffFlowCards } = require('../../lib/flow/ActuatorFlowHelper');

class WifiSonoffTx2chDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerGangOnoffFlowCards(this, 'wifi_sonoff_tx_2ch', 2);
  }
}

module.exports = WifiSonoffTx2chDriver;
