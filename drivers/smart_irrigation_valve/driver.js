'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartIrrigationValveDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    this.log('SmartIrrigationValveDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const triggers = ['smart_irrigation_valve_turned_on', 'smart_irrigation_valve_turned_off'];
    for (const id of triggers) {
      try {
        this.homey.flow.getDeviceTriggerCard(id);
      } catch (e) {
        this.error(`Trigger ${id} registration error: ${e.message}`);
      }
    }

    const actions = [
      {
        id: 'smart_irrigation_valve_turn_on',
        fn: async (args) => {
          await args.device.safeSetCapabilityValue('onoff', true);
          return true;
        }
      },
      {
        id: 'smart_irrigation_valve_turn_off',
        fn: async (args) => {
          await args.device.safeSetCapabilityValue('onoff', false);
          return true;
        }
      },
    ];

    for (const { id, fn } of actions) {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) return false;
            return fn(args);
          });
        }
      } catch (e) {
        this.error(`Action ${id} registration error: ${e.message}`);
      }
    }

    try {
      const faultCard = this.homey.flow.getConditionCard('smart_irrigation_valve_fault_active');
      if (faultCard) {
        faultCard.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_fault') === true;
        });
      }
    } catch (e) {
      this.log(`[FLOW] smart_irrigation_valve_fault_active error: ${e.message}`);
    }

    this.log('[FLOW] Smart irrigation valve flow cards registered');
  }
}

module.exports = SmartIrrigationValveDriver;
