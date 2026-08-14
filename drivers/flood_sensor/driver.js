'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerAlarmCondition } = require('../../lib/flow/ActuatorFlowHelper');

class FloodSensorDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerAlarmCondition(this, 'flood_sensor_alarm_water_active', 'alarm_water', true);
    this.log('[FLOW] flood_sensor condition registered (P130)');
  }
}

module.exports = FloodSensorDriver;
