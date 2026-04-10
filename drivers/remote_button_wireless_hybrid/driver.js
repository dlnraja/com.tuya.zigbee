'use strict';

const Homey = require('homey');

class RemoteButtonWirelessHybridDriver extends Homey.Driver {

  async onInit() {
    this.log('Remote Button Wireless Hybrid driver initialized');

    // Register flow cards
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // Rotate left trigger
<<<<<<< HEAD
      this.homey.flow.getTriggerCard('smart_knob_rotary_rotate_left')
      .registerRunListener(async (args, state) => true);
||||||| parent of 5373b92b80 (feat: Autonomous Awakening v7.2.5 Hardening (Smart Emulation & Health Scaling))
      (() => { try { return (() => { try { return this.homey.flow.getTriggerCard('smart_knob_rotary_rotate_left'); } catch(e) { return null; } })(); } catch(e) { return null; } })();
      .registerRunListener(async (args, state) => true);
=======
    this.homey.flow.getTriggerCard('remote_button_wireless_hybrid_rotate_left');
>>>>>>> 5373b92b80 (feat: Autonomous Awakening v7.2.5 Hardening (Smart Emulation & Health Scaling))

    // Rotate right trigger
<<<<<<< HEAD
      this.homey.flow.getTriggerCard('smart_knob_rotary_rotate_right')
      .registerRunListener(async (args, state) => true);
||||||| parent of 5373b92b80 (feat: Autonomous Awakening v7.2.5 Hardening (Smart Emulation & Health Scaling))
      (() => { try { return (() => { try { return this.homey.flow.getTriggerCard('smart_knob_rotary_rotate_right'); } catch(e) { return null; } })(); } catch(e) { return null; } })();
      .registerRunListener(async (args, state) => true);
=======
    this.homey.flow.getTriggerCard('remote_button_wireless_hybrid_rotate_right');
>>>>>>> 5373b92b80 (feat: Autonomous Awakening v7.2.5 Hardening (Smart Emulation & Health Scaling))

    // Button pressed trigger
<<<<<<< HEAD
      this.homey.flow.getTriggerCard('smart_knob_rotary_pressed')
      .registerRunListener(async (args, state) => true);

    // Single press trigger
      this.homey.flow.getTriggerCard('smart_knob_rotary_single_press')
      .registerRunListener(async (args, state) => true);

    // Double press trigger
      this.homey.flow.getTriggerCard('smart_knob_rotary_double_press')
      .registerRunListener(async (args, state) => true);

    // Long press trigger
      this.homey.flow.getTriggerCard('smart_knob_rotary_long_press')
      .registerRunListener(async (args, state) => true);

    // Brightness condition
      this.homey.flow.getConditionCard('smart_knob_rotary_brightness_above')
      .registerRunListener(async (args, state) => {
        const device = args.device;
        if (device && device.hasCapability('dim')) {
          const brightness = await device.getCapabilityValue('dim');
          return (brightness * 100) > args.level;
        }
        return false;
      });
||||||| parent of 5373b92b80 (feat: Autonomous Awakening v7.2.5 Hardening (Smart Emulation & Health Scaling))
      (() => { try { return (() => { try { return this.homey.flow.getTriggerCard('smart_knob_rotary_pressed'); } catch(e) { return null; } })(); } catch(e) { return null; } })();
      .registerRunListener(async (args, state) => true);

    // Single press trigger
      (() => { try { return (() => { try { return this.homey.flow.getTriggerCard('smart_knob_rotary_single_press'); } catch(e) { return null; } })(); } catch(e) { return null; } })();
      .registerRunListener(async (args, state) => true);

    // Double press trigger
      (() => { try { return (() => { try { return this.homey.flow.getTriggerCard('smart_knob_rotary_double_press'); } catch(e) { return null; } })(); } catch(e) { return null; } })();
      .registerRunListener(async (args, state) => true);

    // Long press trigger
      (() => { try { return (() => { try { return this.homey.flow.getTriggerCard('smart_knob_rotary_long_press'); } catch(e) { return null; } })(); } catch(e) { return null; } })();
      .registerRunListener(async (args, state) => true);

    // Brightness condition
      (() => { try { return (() => { try { return this.homey.flow.getConditionCard('smart_knob_rotary_brightness_above'); } catch(e) { return null; } })(); } catch(e) { return null; } })();
      .registerRunListener(async (args, state) => {
        const device = args.device;
        if (device && device.hasCapability('dim')) {
          const brightness = await device.getCapabilityValue('dim');
          return (brightness * 100) > args.level;
        }
        return false;
      });
=======
    this.homey.flow.getTriggerCard('remote_button_wireless_hybrid_press');
>>>>>>> 5373b92b80 (feat: Autonomous Awakening v7.2.5 Hardening (Smart Emulation & Health Scaling))

    this.log('Flow cards registered');
  }

}

module.exports = RemoteButtonWirelessHybridDriver;
