'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WirelessSwitchDriver extends ZigBeeDriver {
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
    this.log('WirelessSwitchDriver v5.5.581 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('switch_wireless_onoff_true'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wireless_onoff_false'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wireless_button_pressed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wireless_single_press'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wireless_double_press'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wireless_long_press'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wireless_battery_low'); } catch (e) {}

    // CONDITIONS
    try {
      const card = const card = this.homey.flow.getConditionCard('switch_wireless_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition switch_wireless_is_on: ${err.message}`); }

    // ACTIONS
    try {
      const card = const card = this.homey.flow.getActionCard('switch_wireless_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wireless_turn_on: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wireless_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wireless_turn_off: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wireless_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wireless_toggle: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = WirelessSwitchDriver;
