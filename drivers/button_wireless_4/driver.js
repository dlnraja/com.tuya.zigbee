'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Button4GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Button4GangDriver initialized');
    
    // Register universal flow cards (shared across all button drivers)
    this.registerUniversalFlowCards();
  }

  /**
   * Register universal button flow cards
   * These work for any button device
   */
  registerUniversalFlowCards() {
    // Generic button pressed (any button)
    this.homey.flow.getDeviceTriggerCard('button_wireless_4_button_pressed')
      .registerRunListener(async (args, state) => {
        return true; // Always trigger
      });

    // Generic double press
    this.homey.flow.getDeviceTriggerCard('button_wireless_4_button_double_press')
      .registerRunListener(async (args, state) => {
        return true;
      });

    // Generic long press
    this.homey.flow.getDeviceTriggerCard('button_wireless_4_button_long_press')
      .registerRunListener(async (args, state) => {
        return true;
      });

    // Generic multi press
    this.homey.flow.getDeviceTriggerCard('button_wireless_4_button_multi_press')
      .registerRunListener(async (args, state) => {
        return true;
      });
  }
}

module.exports = Button4GangDriver;
