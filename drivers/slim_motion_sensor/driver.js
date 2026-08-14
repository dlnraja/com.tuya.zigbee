'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerAlarmCondition } = require('../../lib/flow/ActuatorFlowHelper');

class SlimMotionSensorDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerAlarmCondition(this, 'slim_motion_sensor_alarm_motion_active', 'alarm_motion', true);
    this.log('[FLOW] slim_motion_sensor condition registered (P130)');
  }
}

module.exports = SlimMotionSensorDriver;
