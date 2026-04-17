'use strict';
const { safeMultiply } = require('../../lib/utils/tuyaUtils.js');

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
    const driverId = 'smart_knob_rotary';

    // Rotate left trigger
    this._getFlowCard(`${driverId}_rotate_left`, 'trigger')
      .registerRunListener(async (args, state) => true);

    // Rotate right trigger
    this._getFlowCard(`${driverId}_rotate_right`, 'trigger')
      .registerRunListener(async (args, state) => true);

    // Button pressed trigger
    this._getFlowCard(`${driverId}_pressed`, 'trigger')
      .registerRunListener(async (args, state) => true);

    // Single press trigger
    this._getFlowCard(`${driverId}_single_press`, 'trigger')
      .registerRunListener(async (args, state) => true);

    // Double press trigger
    this._getFlowCard(`${driverId}_double_press`, 'trigger')
      .registerRunListener(async (args, state) => true);

    // Long press trigger
    this._getFlowCard(`${driverId}_long_press`, 'trigger')
      .registerRunListener(async (args, state) => true);

    // Brightness condition
    this._getFlowCard(`${driverId}_brightness_above`, 'condition')
      .registerRunListener(async (args, state) => {
        const device = args.device;
        if (device && device.hasCapability('dim')) {
          const brightness = await device.getCapabilityValue('dim');
return safeMultiply((brightness, 100)) > args.level;
        }
        return false;
      });

    this.log('Flow cards registered');
  }

}

module.exports = SmartKnobRotaryDriver;
