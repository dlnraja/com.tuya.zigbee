'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchDimmer1GangDriver extends ZigBeeDriver {
  async onInit() {
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
        this.homey.flow.getDeviceTriggerCard(id);
        this.log(`Trigger: ${id}`);
      } catch (err) {
        this.error(`Failed trigger ${id}: ${err.message}`);
      }
    }

    // Action: set brightness
    try {
      this.homey.flow.getActionCard('switch_dimmer_1gang_set_brightness')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const dim = args.brightness / 100;
          await args.device.triggerCapabilityListener('dim', dim);
          return true;
        });
      this.log('Action: set_brightness');
    } catch (err) {
      this.error('Action set_brightness failed:', err.message);
    }

    // Action: turn on
    try {
      this.homey.flow.getActionCard('switch_dimmer_1gang_turn_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true);
          return true;
        });
    } catch (err) { this.error('Action turn_on failed:', err.message); }

    // Action: turn off
    try {
      this.homey.flow.getActionCard('switch_dimmer_1gang_turn_off')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false);
          return true;
        });
    } catch (err) { this.error('Action turn_off failed:', err.message); }

    // Action: toggle
    try {
      this.homey.flow.getActionCard('switch_dimmer_1gang_toggle')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const cur = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !cur);
          return true;
        });
    } catch (err) { this.error('Action toggle failed:', err.message); }
  }
}

module.exports = SwitchDimmer1GangDriver;
