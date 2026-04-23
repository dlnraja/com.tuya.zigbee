'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class CeilingFanDriver extends ZigBeeDriver {
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
    this.log('CeilingFanDriver v5.5.575 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('ceiling_fan_turned_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('ceiling_fan_turned_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('ceiling_fan_dim_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('ceiling_fan_battery_low'); } catch (e) {}

    // CONDITIONS
    try {
      const card = const card = this.homey.flow.getConditionCard('ceiling_fan_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition ceiling_fan_is_on: ${err.message}`); }

    // ACTIONS
    try {
      const card = const card = this.homey.flow.getActionCard('ceiling_fan_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action ceiling_fan_turn_on: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('ceiling_fan_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action ceiling_fan_turn_off: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('ceiling_fan_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action ceiling_fan_toggle: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('ceiling_fan_set_dim');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action ceiling_fan_set_dim: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('ceiling_fan_set_brightness');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action ceiling_fan_set_brightness: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = CeilingFanDriver;
