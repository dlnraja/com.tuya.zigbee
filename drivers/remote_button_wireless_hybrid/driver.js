'use strict';

const Homey = require('homey');

class RemoteButtonWirelessHybridDriver extends Homey.Driver {

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('Remote Button Wireless Hybrid driver initialized');

    // Register flow cards
    this._registerFlowCards();
  
  
  
  
  
  }

  _registerFlowCards() {
    const driverId = 'remote_button_wireless_hybrid';

    // Rotate left trigger
    this.homey.flow.getTriggerCard(`${driverId}_rotate_left`)
      .registerRunListener(async (args, state) => true);

    // Rotate right trigger
    this.homey.flow.getTriggerCard(`${driverId}_rotate_right`)
      .registerRunListener(async (args, state) => true);

    // Button pressed trigger
    this.homey.flow.getTriggerCard(`${driverId}_pressed`)
      .registerRunListener(async (args, state) => true);

    // Single press trigger
    this.homey.flow.getTriggerCard(`${driverId}_single_press`)
      .registerRunListener(async (args, state) => true);

    // Double press trigger
    this.homey.flow.getTriggerCard(`${driverId}_double_press`)
      .registerRunListener(async (args, state) => true);

    // Long press trigger
    this.homey.flow.getTriggerCard(`${driverId}_long_press`)
      .registerRunListener(async (args, state) => true);

    // Brightness condition
    this.homey.flow.getConditionCard(`${driverId}_brightness_above`)
      .registerRunListener(async (args, state) => {
        const device = args.device;
        if (device && device.hasCapability('dim')) {
          const brightness = await device.getCapabilityValue('dim');
          return (brightness * 100) > args.level;
        }
        return false;
      });

    this.log('Flow cards registered');
  }

}

module.exports = RemoteButtonWirelessHybridDriver;
