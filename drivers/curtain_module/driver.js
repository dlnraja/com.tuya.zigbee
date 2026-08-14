'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const {
  registerOnoffFlowCards,
  registerCoverOpenClose,
  registerGangOnoffFlowCards,
  setActuatorCapability,
  registerAlarmCondition,
} = require('../../lib/flow/ActuatorFlowHelper');

class CurtainModuleDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerCoverOpenClose(
      this,
      'curtain_module_move_open',
      'curtain_module_move_close',
    );
    this.log('[FLOW] Curtain module open/close actions registered (P130)');
  }
}

module.exports = CurtainModuleDriver;
