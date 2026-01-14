'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.533: Button 1-Gang Driver - FIXED flow card IDs to match driver.flow.compose.json
 * v5.5.114: Original - used FlowCardHelper which generated WRONG IDs
 * 
 * CRITICAL: Flow card IDs MUST match driver.flow.compose.json exactly!
 * - Correct: button_wireless_1_button_1gang_button_pressed
 * - Wrong:   button_wireless_1_button_pressed (what FlowCardHelper generated)
 */
class Button1GangDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit(); // v5.5.533: SDK3 CRITICAL - must call super first!
    this.log('Button1GangDriver v5.5.533 initialized');

    // v5.5.533: Register flow cards with CORRECT IDs matching driver.flow.compose.json
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
          const card = this.homey.flow.getDeviceTriggerCard(triggerId);
          if (card) {
            card.registerRunListener(async (args, state) => {
              if (!args.device) {
                this.error(`[FLOW] Device not found for ${triggerId}`);
                return false;
              }
              return true;
            });
            this.log(`[FLOW] ✅ ${triggerId}`);
          }
        } catch (e) {
          this.log(`[FLOW] ⚠️ ${triggerId} not found`);
        }
      }

      // Button 1 specific triggers (no token needed)
      const button1Triggers = [
        'button_wireless_1_button_1gang_button_1_pressed',
        'button_wireless_1_button_1gang_button_1_double',
        'button_wireless_1_button_1gang_button_1_long'
      ];

      for (const triggerId of button1Triggers) {
        try {
          const card = this.homey.flow.getDeviceTriggerCard(triggerId);
          if (card) {
            card.registerRunListener(async (args, state) => {
              if (!args.device) {
                this.error(`[FLOW] Device not found for ${triggerId}`);
                return false;
              }
              return true;
            });
            this.log(`[FLOW] ✅ ${triggerId}`);
          }
        } catch (e) {
          this.log(`[FLOW] ⚠️ ${triggerId} not found`);
        }
      }

      // Battery trigger
      try {
        const batteryCard = this.homey.flow.getDeviceTriggerCard('button_wireless_1_button_1gang_measure_battery_changed');
        if (batteryCard) {
          batteryCard.registerRunListener(async (args, state) => {
            if (!args.device) return false;
            return true;
          });
          this.log('[FLOW] ✅ button_wireless_1_button_1gang_measure_battery_changed');
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
