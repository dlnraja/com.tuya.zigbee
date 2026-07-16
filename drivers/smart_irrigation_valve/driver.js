'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { safeSetCapabilityValue } = require('../../lib/utils/SafeCapability');

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

    // v9.0.274 (R71): Use the standalone safeSetCapabilityValue function
    // instead of `device.safeSetCapabilityValue(...)` (mixin may not be installed
    // for all device subclasses at flow action time). Also register the
    // action listeners safely so missing flow cards don't crash the driver.
    const safeRegisterAction = (id, fn) => {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return fn(args.device, args);
        });
      } catch (e) {
        if (this.developerDebugMode) this.error(`Action ${id} registration error: ${e.message}`);
      }
    };

    safeRegisterAction('smart_irrigation_valve_turn_on', async (device) => {
      await safeSetCapabilityValue(device, 'onoff', true);
      return true;
    });
    safeRegisterAction('smart_irrigation_valve_turn_off', async (device) => {
      await safeSetCapabilityValue(device, 'onoff', false);
      return true;
    });

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
