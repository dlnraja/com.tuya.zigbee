'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerAlarmCondition } = require('../../lib/flow/ActuatorFlowHelper');

class DoorSensorDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerAlarmCondition(this, 'door_sensor_contact_open', 'alarm_contact', true);
    registerAlarmCondition(this, 'door_sensor_tamper_active', 'alarm_tamper', true);
    this.log('[FLOW] door_sensor conditions registered (P130)');
  }
}

module.exports = DoorSensorDriver;
