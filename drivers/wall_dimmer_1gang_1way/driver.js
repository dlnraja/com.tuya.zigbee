'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');

class WallDimmer1Gang1WayDriver extends BaseZigBeeDriver {
async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('Wall Dimmer 1-Gang 1-Way Driver has been initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    // CONDITIONS
    try {
      const card = this._getFlowCard('wall_dimmer_1gang_1way_is_on', 'condition');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition wall_dimmer_1gang_1way_is_on: ${err.message}`); }; }

    // ACTIONS
    try {
      const card = this._getFlowCard('wall_dimmer_1gang_1way_set_backlight', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          if (typeof args.device.setBacklightMode === 'function') {await args.device.setBacklightMode(args.mode || args.value);}
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action wall_dimmer_1gang_1way_set_backlight: ${err.message}`); }; }

    try {
      const card = this._getFlowCard('wall_dimmer_1gang_1way_turn_on', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action wall_dimmer_1gang_1way_turn_on: ${err.message}`); }; }

    try {
      const card = this._getFlowCard('wall_dimmer_1gang_1way_turn_off', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action wall_dimmer_1gang_1way_turn_off: ${err.message}`); }; }

    try {
      const card = this._getFlowCard('wall_dimmer_1gang_1way_toggle', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const current = args.device.getCapabilityValue('onoff');
          await args.device['setCapabilityValue']('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action wall_dimmer_1gang_1way_toggle: ${err.message}`); }; }

    try {
      const card = this._getFlowCard('wall_dimmer_1gang_1way_set_brightness', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action wall_dimmer_1gang_1way_set_brightness: ${err.message}`); }; }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = WallDimmer1Gang1WayDriver;
