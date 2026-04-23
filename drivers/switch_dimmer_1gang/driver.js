'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchDimmer1GangDriver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
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

    this.log('Switch Dimmer 1-Gang Driver initialized');
    this._registerFlowCards();
  
  
  
  
  
  
  
  }

  _registerFlowCards() {
    const triggers = [
      'switch_dimmer_1gang_turned_on',
      'switch_dimmer_1gang_turned_off',
      'switch_dimmer_1gang_dim_changed',
      'switch_dimmer_1gang_brightness_increased',
      'switch_dimmer_1gang_brightness_decreased'
    ];
    for (const id of triggers) {
      try {

        this.log(`Trigger: ${id}`);
      } catch (err) {
        this.error(`Failed trigger ${id}: ${err.message}`);
      }
    }

    // Action: set brightness
    try {
      const card = const card = this.homey.flow.getActionCard('Action set_brightness failed:');
      if (card) card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const dim = args.brightness * 100;
          await args.device.triggerCapabilityListener('dim', dim);
          return true;
        });
      this.log('Action: set_brightness');
    } catch (err) {
      this.error('Action set_brightness failed:', err.message);
    }

    // Action: turn on
    try {
      const card = const card = this.homey.flow.getActionCard('Action set_brightness failed:');
      if (card) card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, true).catch(() => {});
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        });
    } catch (err) { this.error('Action turn_on failed:', err.message); }

    // Action: turn off
    try {
      const card = const card = this.homey.flow.getActionCard('Action set_brightness failed:');
      if (card) card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, false).catch(() => {});
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        });
    } catch (err) { this.error('Action turn_off failed:', err.message); }

    // Action: toggle
    try {
      const card = const card = this.homey.flow.getActionCard('Action set_brightness failed:');
      if (card) card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const cur = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !cur);
          return true;
        });
    } catch (err) { this.error('Action toggle failed:', err.message); }
  }
}

module.exports = SwitchDimmer1GangDriver;

