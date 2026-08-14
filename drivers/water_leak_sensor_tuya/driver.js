'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerAlarmCondition } = require('../../lib/flow/ActuatorFlowHelper');

class WaterLeakSensorTuyaDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerAlarmCondition(this, 'water_leak_sensor_tuya_alarm_water_active', 'alarm_water', true);
    this.log('[FLOW] water_leak_sensor_tuya condition registered (P130)');
  }
}

module.exports = WaterLeakSensorTuyaDriver;
