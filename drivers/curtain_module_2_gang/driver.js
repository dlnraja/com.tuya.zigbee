'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerCoverOpenClose } = require('../../lib/flow/ActuatorFlowHelper');

class CurtainModule2GangDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerCoverOpenClose(
      this,
      'curtain_module_2_gang_move_open_2gang',
      'curtain_module_2_gang_move_close_2gang',
    );
    this.log('[FLOW] Curtain 2-gang open/close actions registered (P130)');
  }
}

module.exports = CurtainModule2GangDriver;
