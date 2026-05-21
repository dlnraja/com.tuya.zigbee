'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SceneSwitch2Driver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;

    this.log('SceneSwitch2Driver initialized');

    // Register flow triggers with button argument
    this._buttonPressedTrigger = this.homey.flow.getDeviceTriggerCard('scene_switch_2_button_pressed_dup_g1nwx');
    this._buttonDoubleTrigger = this.homey.flow.getDeviceTriggerCard('scene_switch_2_button_double_press_dup_fcxz9');
    this._buttonLongTrigger = this.homey.flow.getDeviceTriggerCard('scene_switch_2_button_long_press_dup_8i0bq');

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
