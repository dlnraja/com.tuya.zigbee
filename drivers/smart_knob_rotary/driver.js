'use strict';

const Homey = require('homey');

class SmartKnobRotaryDriver extends Homey.Driver {

  async onInit() {
    this.log('Smart Knob Rotary driver initialized');

    // Register flow cards
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // Rotate left trigger
    this.homey.flow.getDeviceTriggerCard('smart_knob_rotate_left')
      .registerRunListener(async (args, state) => true);

    // Rotate right trigger
    this.homey.flow.getDeviceTriggerCard('smart_knob_rotate_right')
      .registerRunListener(async (args, state) => true);

    // Button pressed trigger
    this.homey.flow.getDeviceTriggerCard('smart_knob_pressed')
      .registerRunListener(async (args, state) => true);

    // Single press trigger
    this.homey.flow.getDeviceTriggerCard('smart_knob_single_press')
      .registerRunListener(async (args, state) => true);

    // Double press trigger
    this.homey.flow.getDeviceTriggerCard('smart_knob_double_press')
      .registerRunListener(async (args, state) => true);

    // Long press trigger
    this.homey.flow.getDeviceTriggerCard('smart_knob_long_press')
      .registerRunListener(async (args, state) => true);

    // Brightness condition
    this.homey.flow.getConditionCard('smart_knob_brightness_above')
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
