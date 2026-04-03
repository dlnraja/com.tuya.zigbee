'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SceneSwitch6Driver extends ZigBeeDriver {

  async onInit() {
    this.log('SceneSwitch6Driver initialized');

    // Register flow triggers with button argument
    this._buttonPressedTrigger = this.homey.flow.getDeviceTriggerCard('scene_switch_6_button_pressed');
    this._buttonDoubleTrigger = this.homey.flow.getDeviceTriggerCard('scene_switch_6_button_double_press');
    this._buttonLongTrigger = this.homey.flow.getDeviceTriggerCard('scene_switch_6_button_long_press');

    // Register argument filters
    this._buttonPressedTrigger.registerRunListener(async (args, state) => args.button === state.button);
    this._buttonDoubleTrigger.registerRunListener(async (args, state) => args.button === state.button);
    this._buttonLongTrigger.registerRunListener(async (args, state) => args.button === state.button);

    this.log('SceneSwitch6Driver flow triggers registered');
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

module.exports = SceneSwitch6Driver;
