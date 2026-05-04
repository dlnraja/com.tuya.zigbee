'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WallDimmer1Gang1WayDriver extends ZigBeeDriver {
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
    this.log('WallDimmer1Gang1WayDriver v7.5.1 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('wall_dimmer_1gang_1way_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition wall_dimmer_1gang_1way_is_on: ${err.message}`); }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('wall_dimmer_1gang_1way_set_backlight');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.setBacklightMode === 'function') await args.device.setBacklightMode(args.mode || args.value);
          return true;
        });
      }
    } catch (err) { this.error(`Action wall_dimmer_1gang_1way_set_backlight: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('wall_dimmer_1gang_1way_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action wall_dimmer_1gang_1way_turn_on: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('wall_dimmer_1gang_1way_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action wall_dimmer_1gang_1way_turn_off: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('wall_dimmer_1gang_1way_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action wall_dimmer_1gang_1way_toggle: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('wall_dimmer_1gang_1way_set_brightness');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action wall_dimmer_1gang_1way_set_brightness: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = WallDimmer1Gang1WayDriver;