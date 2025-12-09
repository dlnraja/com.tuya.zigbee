'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.113: Register flow cards for button_wireless driver
 */
class ButtonWirelessDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ButtonWirelessDriver initialized');

    // v5.5.113: Register driver-specific flow cards
    this._registerFlowCards();
  }

  /**
   * v5.5.113: Register all flow trigger cards for this driver
   */
  _registerFlowCards() {
    // Driver-specific triggers
    const triggers = [
      'button_wireless_button_pressed',
      'button_wireless_button_double_pressed',
      'button_wireless_button_long_pressed',
      'button_wireless_button_released',
      'button_wireless_battery_low'
    ];

    for (const triggerId of triggers) {
      try {
        const card = this.homey.flow.getDeviceTriggerCard(triggerId);
        if (card) {
          card.registerRunListener(async (args, state) => true);
          this.log(`[FLOW] ✅ Registered: ${triggerId}`);
        }
      } catch (e) {
        this.log(`[FLOW] ⚠️ ${triggerId} not found (may be defined elsewhere)`);
      }
    }

    // Generic triggers (from .homeycompose)
    const genericTriggers = [
      'button_pressed',
      'button_double_press',
      'button_long_press'
    ];

    for (const triggerId of genericTriggers) {
      try {
        const card = this.homey.flow.getDeviceTriggerCard(triggerId);
        if (card) {
          card.registerRunListener(async (args, state) => true);
          this.log(`[FLOW] ✅ Registered generic: ${triggerId}`);
        }
      } catch (e) {
        // Silent - generic cards may not exist yet
      }
    }

    this.log('[FLOW] Flow cards registration complete');
  }

}

module.exports = ButtonWirelessDriver;
