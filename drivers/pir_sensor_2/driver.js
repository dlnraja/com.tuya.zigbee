'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerAlarmCondition } = require('../../lib/flow/ActuatorFlowHelper');

class PirSensor2Driver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerAlarmCondition(this, 'pir_sensor_2_alarm_motion_active', 'alarm_motion', true);
    this.log('[FLOW] pir_sensor_2 condition registered (P130)');
  }
}

module.exports = PirSensor2Driver;
