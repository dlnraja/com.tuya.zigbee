'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class CeilingPresenceSensorDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    this.log('Ceiling Presence Sensor Driver v5.13.3 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const actionCards = [
      {
        id: 'presence_sensor_ceiling_turn_on',
        fn: async ({ device }) => { await device['setCapabilityValue']('onoff', true); return true; }
      },
      {
        id: 'presence_sensor_ceiling_turn_off',
        fn: async ({ device }) => { await device['setCapabilityValue']('onoff', false); return true; }
      },
      {
        id: 'presence_sensor_ceiling_toggle',
        fn: async ({ device }) => { 
          const v = device.getCapabilityValue('onoff'); 
          await device['setCapabilityValue']('onoff', !v); 
          return true; 
        }
      }
    ];

    for (const { id, fn } of actionCards) {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) {
          card.registerRunListener(fn);
          this.log(`[FLOW] ✅ Action ${id} registered`);
        }
      } catch (err) {
        if (this.developerDebugMode) { this.error(`[FLOW] ⚠️ Action ${id} registration error: ${err.message}`); };
      }
    }

    const conditionCards = [
      {
        id: 'presence_sensor_ceiling_is_on',
        fn: async ({ device }) => device.getCapabilityValue('onoff') === true
      },
      {
        id: 'presence_sensor_ceiling_motion_active',
        fn: async ({ device }) => device.getCapabilityValue('alarm_motion') === true
      }
    ];

    for (const { id, fn } of conditionCards) {
      try {
        const card = this.homey.flow.getConditionCard(id);
        if (card) {
          card.registerRunListener(fn);
          this.log(`[FLOW] ✅ Condition ${id} registered`);
        }
      } catch (err) {
        if (this.developerDebugMode) { this.error(`[FLOW] ⚠️ Condition ${id} registration error: ${err.message}`); };
      }
    }
  }
}

module.exports = CeilingPresenceSensorDriver;
