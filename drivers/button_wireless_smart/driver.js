'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');

/**
 * v5.5.533: Button 1-Gang Driver - FIXED flow card IDs to match driver.flow.compose.json
 * v5.5.114: Original - used FlowCardHelper which generated WRONG IDs
 *
 * CRITICAL: Flow card IDs MUST match driver.flow.compose.json exactly!
 * Fix #333: Use button_wireless_smart_* prefix to match compose.json
 */
class Button1GangDriver extends BaseZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   */
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;

    this.log('Button1GangDriver v5.5.533 initialized');

    // Fix #333: Register flow cards with CORRECT IDs matching driver.flow.compose.json
    // Prefix must be 'button_wireless_smart_button_1gang_*' not 'button_wireless_1_button_1gang_*'
    try {
      // Main triggers with button token
      const mainTriggers = [
        'button_wireless_smart_button_1gang_button_pressed',
        'button_wireless_smart_button_1gang_button_double_press',
        'button_wireless_smart_button_1gang_button_long_press',
        'button_wireless_smart_button_1gang_button_multi_press'
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
          this.log(`[FLOW] ${triggerId} not found`);
        }
      }

      // Button 1 specific triggers (no token needed)
      const button1Triggers = [
        'button_wireless_smart_button_1gang_button_1_pressed',
        'button_wireless_smart_button_1gang_button_1_double',
        'button_wireless_smart_button_1gang_button_1_long',
        'button_wireless_smart_button_1gang_button_1_triple',
        'button_wireless_smart_button_1gang_button_1_release'
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
          this.log(`[FLOW] ${triggerId} not found`);
        }
      }

      // Fix #333: Battery low trigger (was using undefined batteryCard variable)
      try {
        const batteryCard = this._getFlowCard('button_wireless_smart_battery_low', 'trigger');
        if (batteryCard) {
          batteryCard.registerRunListener(async (args, state) => {
            if (!args.device) { return false; }
            return true;
          });
          this.log('[FLOW] Registered: button_wireless_smart_battery_low');
        }
      } catch (e) {
        this.log('[FLOW] battery_low trigger not found');
      }

    } catch (err) {
      this.error('[FLOW] Flow card registration failed:', err.message);
    }
  }
}

module.exports = Button1GangDriver;
