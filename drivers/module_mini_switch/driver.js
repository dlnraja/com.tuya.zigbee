'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class MiniSwitchDriver extends ZigBeeDriver {
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
    this.log('MiniSwitchDriver v5.5.579 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('module_mini_switch_onoff_true'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('module_mini_switch_turned_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('module_mini_switch_turned_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('module_mini_switch_battery_low'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('module_mini_switch_physical_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('module_mini_switch_physical_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('module_mini_switch_power_changed'); } catch (e) {}

    // CONDITIONS
    try {
      const card = const card = this.homey.flow.getConditionCard('module_mini_switch_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition module_mini_switch_is_on: ${err.message}`); }

    // ACTIONS
    try {
      const card = const card = this.homey.flow.getActionCard('module_mini_switch_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action module_mini_switch_turn_on: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('module_mini_switch_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action module_mini_switch_turn_off: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('module_mini_switch_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action module_mini_switch_toggle: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = MiniSwitchDriver;
