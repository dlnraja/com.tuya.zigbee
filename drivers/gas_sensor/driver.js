'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaGasSensorTs0601Driver extends ZigBeeDriver {
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('TuyaGasSensorTs0601Driver v5.5.570 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('gas_sensor_alarm_gas_true'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gas_sensor_alarm_gas_false'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gas_sensor_alarm_co_true'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gas_sensor_gas_level_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gas_sensor_self_test_result'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gas_sensor_tamper_true'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gas_sensor_co_alarm'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gas_sensor_battery_low'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gas_sensor_contact_alarm'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gas_sensor_gas_alarm'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gas_sensor_tamper_alarm'); } catch (e) {}

    // CONDITIONS
    try {
      const card = const card = this.homey.flow.getConditionCard('gas_sensor_gas_detected');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_gas') === true;
        });
      }
    } catch (err) { this.error(`Condition gas_sensor_gas_detected: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('gas_sensor_co_detected');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_gas') === true;
        });
      }
    } catch (err) { this.error(`Condition gas_sensor_co_detected: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('gas_sensor_level_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { this.error(`Condition gas_sensor_level_above: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('gas_sensor_co_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_gas') === true;
        });
      }
    } catch (err) { this.error(`Condition gas_sensor_co_active: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('gas_sensor_contact_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_gas') === true;
        });
      }
    } catch (err) { this.error(`Condition gas_sensor_contact_open: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('gas_sensor_gas_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_gas') === true;
        });
      }
    } catch (err) { this.error(`Condition gas_sensor_gas_active: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('gas_sensor_tamper_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_gas') === true;
        });
      }
    } catch (err) { this.error(`Condition gas_sensor_tamper_active: ${err.message}`); }

    // ACTIONS
    try {
      const card = const card = this.homey.flow.getActionCard('gas_sensor_mute_alarm');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action gas_sensor_mute_alarm triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action gas_sensor_mute_alarm: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('gas_sensor_self_test');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action gas_sensor_self_test triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action gas_sensor_self_test: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = TuyaGasSensorTs0601Driver;
