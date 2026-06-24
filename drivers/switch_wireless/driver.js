'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WirelessSwitchDriver extends ZigBeeDriver {
async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('WirelessSwitchDriver v5.5.581 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('switch_wireless_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition switch_wireless_is_on: ${err.message}`); }; }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('switch_wireless_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action switch_wireless_turn_on: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('switch_wireless_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action switch_wireless_turn_off: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('switch_wireless_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const current = args.device.getCapabilityValue('onoff');
          await args.device['setCapabilityValue']('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action switch_wireless_toggle: ${err.message}`); }; }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = WirelessSwitchDriver;
