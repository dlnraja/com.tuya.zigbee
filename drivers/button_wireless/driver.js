'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.475: FIXED - Moved orphaned flow card code inside onInit()
 */
class ButtonWirelessDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ButtonWirelessDriver v5.5.475 initialized');

    // Register flow triggers
    this._button_pressedTrigger = this.homey.flow.getDeviceTriggerCard('button_pressed');
    this._button_double_pressedTrigger = this.homey.flow.getDeviceTriggerCard('button_double_pressed');
    this._button_long_pressedTrigger = this.homey.flow.getDeviceTriggerCard('button_long_pressed');
    this._button_battery_lowTrigger = this.homey.flow.getDeviceTriggerCard('button_battery_low');

    this.log('button_wireless: Flow cards registered');
  }
}

module.exports = ButtonWirelessDriver;
