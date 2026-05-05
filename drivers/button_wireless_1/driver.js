'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v7.5.9: Button 1-Gang Driver - FIXED to use SDK3 API
 * CRITICAL: Use homey.flow.getTriggerCard() instead of _getFlowCard()
 */
class Button1GangDriver extends ZigBeeDriver {
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('Button1GangDriver v7.5.9 initialized');

    // Safe trigger getter
    const safeTrigger = (id) => {
      try { return this.homey.flow.getTriggerCard(id); } catch(e) { return null; }
    };

    try {
      // Main triggers with button token
      const mainTriggers = [
        'button_wireless_1_button_1gang_button_pressed',
        'button_wireless_1_button_1gang_button_double_press',
        'button_wireless_1_button_1gang_button_long_press',
        'button_wireless_1_button_1gang_button_multi_press'
      ];

      for (const triggerId of mainTriggers) {
        try {
          const card = safeTrigger(triggerId);
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
          this.log(`[FLOW] ${triggerId} not found`);
        }
      }

      // Button 1 specific triggers
      const button1Triggers = [
        'button_wireless_1_button_1gang_button_1_pressed',
        'button_wireless_1_button_1gang_button_1_double',
        'button_wireless_1_button_1gang_button_1_long'
      ];

      for (const triggerId of button1Triggers) {
        try {
          const card = safeTrigger(triggerId);
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
          this.log(`[FLOW] ${triggerId} not found`);
        }
      }

      // Battery trigger
      try {
        const batteryCard = safeTrigger('battery_alarm_low');
        if (batteryCard) {
          batteryCard.registerRunListener(async (args, state) => {
            if (!args.device) return false;
            return true;
          });
        }
      } catch (e) {
        // Optional
      }

    } catch (err) {
      this.error('[FLOW] Flow card registration failed:', err.message);
    }
  }
}

module.exports = Button1GangDriver;