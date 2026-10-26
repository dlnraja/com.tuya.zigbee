'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerEweLinkRepairHandlers } = require('../../lib/ewelink-local/eweLinkRepair'); // P3072
const { registerGangOnoffFlowCards } = require('../../lib/flow/ActuatorFlowHelper');

class WifiSonoffTx3chDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerGangOnoffFlowCards(this, 'wifi_sonoff_tx_3ch', 3);
  }

  // P3072: Repair → change IP / device key, reconnects at once (same handler as EweLinkLocalDriver)
  async onRepair(session, device) {
    registerEweLinkRepairHandlers(session, device, { log: (...a) => this.log(...a) });
  }
}

module.exports = WifiSonoffTx3chDriver;
