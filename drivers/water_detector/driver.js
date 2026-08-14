'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerAlarmCondition } = require('../../lib/flow/ActuatorFlowHelper');

class WaterDetectorDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerAlarmCondition(this, 'water_detector_alarm_water_active', 'alarm_water', true);
    this.log('[FLOW] water_detector condition registered (P130)');
  }
}

module.exports = WaterDetectorDriver;
