'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class HvacAirConditionerDriver extends ZigBeeDriver {
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
    this.log('HvacAirConditionerDriver v5.5.576 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('hvac_air_conditioner_air_conditioner_hybrid_turned_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('hvac_air_conditioner_air_conditioner_hybrid_turned_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('hvac_air_conditioner_air_conditioner_hybrid_target_temperature_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('hvac_air_conditioner_air_conditioner_hybrid_measure_temperature_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('hvac_air_conditioner_turned_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('hvac_air_conditioner_turned_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('hvac_air_conditioner_temp_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('hvac_air_conditioner_battery_low'); } catch (e) {}

    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('hvac_air_conditioner_air_conditioner_hybrid_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition hvac_air_conditioner_air_conditioner_hybrid_is_on: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('hvac_air_conditioner_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition hvac_air_conditioner_is_on: ${err.message}`); }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('hvac_air_conditioner_air_conditioner_hybrid_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action hvac_air_conditioner_air_conditioner_hybrid_turn_on: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('hvac_air_conditioner_air_conditioner_hybrid_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action hvac_air_conditioner_air_conditioner_hybrid_turn_off: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('hvac_air_conditioner_air_conditioner_hybrid_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action hvac_air_conditioner_air_conditioner_hybrid_toggle: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('hvac_air_conditioner_air_conditioner_hybrid_set_target_temperature');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('target_temperature', args.temperature || args.value).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action hvac_air_conditioner_air_conditioner_hybrid_set_target_temperature: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('hvac_air_conditioner_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action hvac_air_conditioner_turn_on: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('hvac_air_conditioner_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action hvac_air_conditioner_turn_off: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('hvac_air_conditioner_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action hvac_air_conditioner_toggle: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('hvac_air_conditioner_set_temperature');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('target_temperature', args.temperature || args.value).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action hvac_air_conditioner_set_temperature: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = HvacAirConditionerDriver;
