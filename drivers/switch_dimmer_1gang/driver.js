'use strict';

const Homey = require('homey');

class SwitchDimmer1GangDriver extends Homey.Driver {

  async onInit() {
    this.log('Switch Touch Dimmer (1 Gang) Driver has been initialized');
    
    // Register flow card listeners
    this.registerFlowCards();
  }

  registerFlowCards() {
    // Register trigger cards (already handled in device.js via trigger())
    this.homey.flow.getDeviceTriggerCard('switch_dimmer_1gang_turned_on');
    this.homey.flow.getDeviceTriggerCard('switch_dimmer_1gang_turned_off');
    this.homey.flow.getDeviceTriggerCard('switch_dimmer_1gang_brightness_increased');
    this.homey.flow.getDeviceTriggerCard('switch_dimmer_1gang_brightness_decreased');

    // Register condition card
    this.homey.flow.getConditionCard('switch_dimmer_1gang_is_on')
      .registerRunListener(async (args) => {
        return args.device.getCapabilityValue('onoff');
      });

    // Register action cards
    this.homey.flow.getActionCard('switch_dimmer_1gang_turn_on')
      .registerRunListener(async (args) => {
        return args.device.setCapabilityValue('onoff', true);
      });

    this.homey.flow.getActionCard('switch_dimmer_1gang_turn_off')
      .registerRunListener(async (args) => {
        return args.device.setCapabilityValue('onoff', false);
      });

    this.homey.flow.getActionCard('switch_dimmer_1gang_set_brightness')
      .registerRunListener(async (args) => {
        return args.device.setCapabilityValue('dim', args.brightness);
      });

    this.log('Flow cards registered');
  }

  async onPairListDevices() {
    return [];
  }

}

module.exports = SwitchDimmer1GangDriver;
