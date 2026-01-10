'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

/**
 * v5.5.114: Button Wireless Driver with flow card registration
 */
class ButtonWirelessDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ButtonWirelessDriver initialized');
    registerButtonFlowCards(this, 'button_wireless', 1);
  }
}

module.exports = ButtonWirelessDriver;

    
    // Register flow triggers
    this._button_pressedTrigger = this.homey.flow.getDeviceTriggerCard('button_pressed');
    this._button_double_pressedTrigger = this.homey.flow.getDeviceTriggerCard('button_double_pressed');
    this._button_long_pressedTrigger = this.homey.flow.getDeviceTriggerCard('button_long_pressed');
    this._button_battery_lowTrigger = this.homey.flow.getDeviceTriggerCard('button_battery_low');
    
    this.log('button_wireless: Flow cards registered');