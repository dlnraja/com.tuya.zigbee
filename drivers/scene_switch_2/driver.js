'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SceneSwitch2Driver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }


  async onInit() {
    this.log('SceneSwitch2Driver initialized');

    // Register flow triggers with button argument
      (() => { try { return this.homey.flow.getDeviceTriggerCard('scene_switch_2_button_pressed'); } catch(e) { return null; } })();
      (() => { try { return this.homey.flow.getDeviceTriggerCard('scene_switch_2_button_double_press'); } catch(e) { return null; } })();
      (() => { try { return this.homey.flow.getDeviceTriggerCard('scene_switch_2_button_long_press'); } catch(e) { return null; } })();

    // Register argument filters
    this._buttonPressedTrigger.registerRunListener(async (args, state) => args.button === state.button);
    this._buttonDoubleTrigger.registerRunListener(async (args, state) => args.button === state.button);
    this._buttonLongTrigger.registerRunListener(async (args, state) => args.button === state.button);

    this.log('SceneSwitch2Driver flow triggers registered');
  }

  triggerButtonPressed(device, button) {
    return this._buttonPressedTrigger.trigger(device, { button }, { button }).catch(this.error);
  }

  triggerButtonDoublePressed(device, button) {
    return this._buttonDoubleTrigger.trigger(device, { button }, { button }).catch(this.error);
  }

  triggerButtonLongPressed(device, button) {
    return this._buttonLongTrigger.trigger(device, { button }, { button }).catch(this.error);
  }

}

module.exports = SceneSwitch2Driver;

