'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SceneSwitch1Driver extends ZigBeeDriver {

  async onInit() {
    this.log('SceneSwitch1Driver initialized');

    // Register flow triggers
    this._buttonPressedTrigger = this.homey.flow.getDeviceTriggerCard('scene_switch_1_button_pressed');
    this._buttonDoubleTrigger = this.homey.flow.getDeviceTriggerCard('scene_switch_1_button_double_press');
    this._buttonLongTrigger = this.homey.flow.getDeviceTriggerCard('scene_switch_1_button_long_press');
    this._batteryChangedTrigger = this.homey.flow.getDeviceTriggerCard('scene_switch_1_battery_changed');

    this.log('SceneSwitch1Driver flow triggers registered');
  }

  triggerButtonPressed(device) {
    return this._buttonPressedTrigger.trigger(device, {}).catch(this.error);
  }

  triggerButtonDoublePressed(device) {
    return this._buttonDoubleTrigger.trigger(device, {}).catch(this.error);
  }

  triggerButtonLongPressed(device) {
    return this._buttonLongTrigger.trigger(device, {}).catch(this.error);
  }

  triggerBatteryChanged(device, tokens) {
    return this._batteryChangedTrigger.trigger(device, tokens).catch(this.error);
  }

}

module.exports = SceneSwitch1Driver;
