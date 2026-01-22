'use strict';

const Homey = require('homey');

class SwitchDimmer1GangDriver extends Homey.Driver {

  async onInit() {
    this.log('Switch Touch Dimmer (1 Gang) Driver has been initialized');
    
    // Register flow card listeners
    this.registerFlowCards();
  }

  registerFlowCards() {
    // Register trigger cards (these will be used in device.js via trigger())
    this.homey.flow.getDeviceTriggerCard('switch_dimmer_1gang_turned_on');
    this.homey.flow.getDeviceTriggerCard('switch_dimmer_1gang_turned_off');
    this.homey.flow.getDeviceTriggerCard('switch_dimmer_1gang_brightness_increased');
    this.homey.flow.getDeviceTriggerCard('switch_dimmer_1gang_brightness_decreased');

    this.log('Flow trigger cards registered');
  }

  async onPairListDevices() {
    return [];
  }

}

module.exports = SwitchDimmer1GangDriver;
