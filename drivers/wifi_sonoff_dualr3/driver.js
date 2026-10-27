'use strict';

const EweLinkLocalDriver = require('../../lib/ewelink-local/EweLinkLocalDriver'); // P3072: LAN pair handlers (ZigBeeDriver had none)
const { registerGangOnoffFlowCards } = require('../../lib/flow/ActuatorFlowHelper');

class WifiSonoffDualr3Driver extends EweLinkLocalDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerGangOnoffFlowCards(this, 'wifi_sonoff_dualr3', 2);
  }

  // P3072: Repair (change IP / device key) is inherited from EweLinkLocalDriver.onRepair
}

module.exports = WifiSonoffDualr3Driver;
