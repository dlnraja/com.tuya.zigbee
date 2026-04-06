'use strict';

const { Driver } = require('homey');

class RemoteDimmerDriver extends Driver {
  async onInit() {
    this.log('Remote Control Dimmer driver initialized');

    // Trigger: ON button pressed
    this.homey.flow.getTriggerCard('remote_dimmer_button_on')
      .registerRunListener(async () => true);

    // Trigger: OFF button pressed
    this.homey.flow.getTriggerCard('remote_dimmer_button_off')
      .registerRunListener(async () => true);

    // Trigger: Toggle button pressed
    this.homey.flow.getTriggerCard('remote_dimmer_button_toggle')
      .registerRunListener(async () => true);

    // Trigger: Brightness up
    this.homey.flow.getTriggerCard('remote_dimmer_brightness_up')
      .registerRunListener(async () => true);

    // Trigger: Brightness down
    this.homey.flow.getTriggerCard('remote_dimmer_brightness_down')
      .registerRunListener(async () => true);

    // Trigger: Brightness stop
    this.homey.flow.getTriggerCard('remote_dimmer_brightness_stop')
      .registerRunListener(async () => true);

    // Trigger: Brightness set
    this.homey.flow.getTriggerCard('remote_dimmer_brightness_set')
      .registerRunListener(async () => true);

    // Trigger: Scene recalled
    this.homey.flow.getTriggerCard('remote_dimmer_scene')
      .registerRunListener(async () => true);
  }
}

module.exports = RemoteDimmerDriver;

