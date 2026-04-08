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
      (() => { try { return this.homey.flow.getDeviceTriggerCard('smart_knob_rotary_rotate_left'); } catch(e) { return null; } })();
      .registerRunListener(async (args, state) => true);

    // Rotate right trigger
      (() => { try { return this.homey.flow.getDeviceTriggerCard('smart_knob_rotary_rotate_right'); } catch(e) { return null; } })();
      .registerRunListener(async (args, state) => true);

    // Button pressed trigger
      (() => { try { return this.homey.flow.getDeviceTriggerCard('smart_knob_rotary_pressed'); } catch(e) { return null; } })();
      .registerRunListener(async (args, state) => true);

    // Single press trigger
      (() => { try { return this.homey.flow.getDeviceTriggerCard('smart_knob_rotary_single_press'); } catch(e) { return null; } })();
      .registerRunListener(async (args, state) => true);

    // Double press trigger
      (() => { try { return this.homey.flow.getDeviceTriggerCard('smart_knob_rotary_double_press'); } catch(e) { return null; } })();
      .registerRunListener(async (args, state) => true);

    // Long press trigger
      (() => { try { return this.homey.flow.getDeviceTriggerCard('smart_knob_rotary_long_press'); } catch(e) { return null; } })();
      .registerRunListener(async (args, state) => true);

    // Brightness condition
      (() => { try { return this.homey.flow.getDeviceConditionCard('smart_knob_rotary_brightness_above'); } catch(e) { return null; } })();
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


