'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class BulbRgbwDriver extends ZigBeeDriver {
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
    this.log('BulbRgbwDriver v5.5.574 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('bulb_rgbw_bulb_rgbw_turned_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('bulb_rgbw_bulb_rgbw_turned_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('bulb_rgbw_turned_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('bulb_rgbw_turned_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('bulb_rgbw_battery_low'); } catch (e) {}

    // CONDITIONS
    try {
      const card = const card = this.homey.flow.getConditionCard('bulb_rgbw_bulb_rgbw_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition bulb_rgbw_bulb_rgbw_is_on: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('bulb_rgbw_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition bulb_rgbw_is_on: ${err.message}`); }

    // ACTIONS
    try {
      const card = const card = this.homey.flow.getActionCard('bulb_rgbw_bulb_rgbw_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action bulb_rgbw_bulb_rgbw_turn_on: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('bulb_rgbw_bulb_rgbw_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action bulb_rgbw_bulb_rgbw_turn_off: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('bulb_rgbw_bulb_rgbw_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action bulb_rgbw_bulb_rgbw_toggle: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('bulb_rgbw_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action bulb_rgbw_turn_on: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('bulb_rgbw_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action bulb_rgbw_turn_off: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('bulb_rgbw_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action bulb_rgbw_toggle: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('bulb_rgbw_set_brightness');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action bulb_rgbw_set_brightness: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = BulbRgbwDriver;
