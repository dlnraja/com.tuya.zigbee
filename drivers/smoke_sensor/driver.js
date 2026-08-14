'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerAlarmCondition } = require('../../lib/flow/ActuatorFlowHelper');

class SmokeSensorDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerAlarmCondition(this, 'smoke_sensor_alarm_smoke_active', 'alarm_smoke', true);
    this.log('[FLOW] smoke_sensor condition registered (P130)');
  }
}

module.exports = SmokeSensorDriver;
