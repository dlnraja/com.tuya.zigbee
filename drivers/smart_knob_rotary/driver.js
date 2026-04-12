'use strict';

const Homey = require('homey');

class SmartKnobRotaryDriver extends Homey.Driver {

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('Smart Knob Rotary driver initialized');

    // Register flow cards
    this._registerFlowCards();
  
  
  
  
  }

  _registerFlowCards() {
    // Rotate left trigger

      .registerRunListener(async (args, state) => true);

    // Rotate right trigger

      .registerRunListener(async (args, state) => true);

    // Button pressed trigger

      .registerRunListener(async (args, state) => true);

    // Single press trigger

      .registerRunListener(async (args, state) => true);

    // Double press trigger

      .registerRunListener(async (args, state) => true);

    // Long press trigger

      .registerRunListener(async (args, state) => true);

    // Brightness condition

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

module.exports = SmartKnobRotaryDriver;
