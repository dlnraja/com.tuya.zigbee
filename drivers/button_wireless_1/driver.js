'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');

/**
 * v10.0.1: Button 1-Gang Driver for button_wireless_1
 * Fixes: undefined batteryCard, duplicate _flowCardsRegistered, missing flow cards in compose
 *
 * CRITICAL: Flow card IDs MUST match driver.flow.compose.json exactly!
 */
class Button1GangDriver extends BaseZigBeeDriver {

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('Button1GangDriver v10.0.1 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // Main triggers with button token
    const mainTriggers = [
      'button_wireless_1_button_1gang_button_pressed',
      'button_wireless_1_button_1gang_button_double_press',
      'button_wireless_1_button_1gang_button_long_press',
      'button_wireless_1_button_1gang_button_multi_press'
    ];

    for (const triggerId of mainTriggers) {
      try {
        const card = this._getFlowCard(triggerId, 'trigger');
        if (card) {
          card.registerRunListener(async (args, state) => {
            if (!args.device) {
              this.error(`[FLOW] Device not found for ${triggerId}`);
              return false;
            }
            return true;
          });
          this.log(`[FLOW] Registered: ${triggerId}`);
        }
      } catch (e) {
        this.log(`[FLOW] ${triggerId} not available: ${e.message}`);
      }
    }

    // Button 1 specific triggers (no token needed)
    const button1Triggers = [
      'button_wireless_1_button_1gang_button_1_pressed',
      'button_wireless_1_button_1gang_button_1_double',
      'button_wireless_1_button_1gang_button_1_long',
      'button_wireless_1_button_1gang_button_1_triple',
      'button_wireless_1_button_1gang_button_1_release'
    ];

    for (const triggerId of button1Triggers) {
      try {
        const card = this._getFlowCard(triggerId, 'trigger');
        if (card) {
          card.registerRunListener(async (args, state) => {
            if (!args.device) {
              this.error(`[FLOW] Device not found for ${triggerId}`);
              return false;
            }
            return true;
          });
          this.log(`[FLOW] Registered: ${triggerId}`);
        }
      } catch (e) {
        this.log(`[FLOW] ${triggerId} not available: ${e.message}`);
      }
    }

    // Battery trigger
    try {
      const batteryCard = this._getFlowCard('button_wireless_1_battery_low', 'trigger');
      if (batteryCard) {
        batteryCard.registerRunListener(async (args, state) => {
          if (!args.device) return false;
          return true;
        });
        this.log('[FLOW] Registered: button_wireless_1_battery_low');
      }
    } catch (e) {
      // Optional
    }
  }
}

module.exports = Button1GangDriver;
