'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerAlarmCondition } = require('../../lib/flow/ActuatorFlowHelper');

class PirMmwaveSensorDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerAlarmCondition(this, 'pir_mmwave_sensor_has_presence', 'alarm_motion', true);
    this.log('[FLOW] pir_mmwave_sensor condition registered (P130)');
  }
}

module.exports = PirMmwaveSensorDriver;
