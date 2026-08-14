'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerAlarmCondition } = require('../../lib/flow/ActuatorFlowHelper');

class PirsensorDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerAlarmCondition(this, 'pirsensor_alarm_motion_active', 'alarm_motion', true);
    this.log('[FLOW] pirsensor condition registered (P130)');
  }
}

module.exports = PirsensorDriver;
