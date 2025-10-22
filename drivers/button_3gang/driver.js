'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Button3GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Button3GangDriver initialized');
    
    // Register universal flow cards (shared across all button drivers)
    this.registerUniversalFlowCards();
  }

  /**
   * Register universal button flow cards
   * These work for any button device
   */
  registerUniversalFlowCards() {
    // Generic button pressed (any button)
    this.homey.flow.getDeviceTriggerCard('button_pressed')
      .registerRunListener(async (args, state) => {
        return true; // Always trigger
      });

    // Generic double press
    this.homey.flow.getDeviceTriggerCard('button_double_press')
      .registerRunListener(async (args, state) => {
        return true;
      });

    // Generic long press
    this.homey.flow.getDeviceTriggerCard('button_long_press')
      .registerRunListener(async (args, state) => {
        return true;
      });

    // Generic multi press
    this.homey.flow.getDeviceTriggerCard('button_multi_press')
      .registerRunListener(async (args, state) => {
        return true;
      });
  }
}

module.exports = Button3GangDriver;
