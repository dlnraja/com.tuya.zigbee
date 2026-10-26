'use strict';

const EweLinkLocalDriver = require('../../lib/ewelink-local/EweLinkLocalDriver'); // P3072: LAN pair handlers (ZigBeeDriver had none)
const { registerEweLinkRepairHandlers } = require('../../lib/ewelink-local/eweLinkRepair'); // P3072
const { registerGangOnoffFlowCards } = require('../../lib/flow/ActuatorFlowHelper');

class WifiSonoffTx2chDriver extends EweLinkLocalDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerGangOnoffFlowCards(this, 'wifi_sonoff_tx_2ch', 2);
  }

  // P3072: Repair → change IP / device key, reconnects at once (same handler as EweLinkLocalDriver)
  async onRepair(session, device) {
    registerEweLinkRepairHandlers(session, device, { log: (...a) => this.log(...a) });
  }
}

module.exports = WifiSonoffTx2chDriver;
