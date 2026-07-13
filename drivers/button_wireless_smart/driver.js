'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');

/**
 * v5.5.533: Smart Button 1-Gang Driver - FIXED flow card IDs to match driver.flow.compose.json
 * v5.5.114: Original - used FlowCardHelper which generated WRONG IDs
 *
 * CRITICAL: Flow card IDs MUST match driver.flow.compose.json exactly!
 * - Correct: button_wireless_smart_button_1gang_button_pressed
 * - Wrong:   button_wireless_smart_button_pressed (what FlowCardHelper generated)
 */
class ButtonWirelessSmartDriver extends BaseZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
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
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;

    this.log('ButtonWirelessSmartDriver v10.1.0 initialized (P26.4 multi-endpoint support)');

    // v5.5.533: Register flow cards with CORRECT IDs matching driver.flow.compose.json
    // P26.4: Register flow cards for up to 4 buttons (multi-endpoint devices)
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
            this.log(`[FLOW] Registered ${triggerId}`);
          }
        } catch (e) {
          this.log(`[FLOW] ${triggerId} not found`);
        }
      }

      // Per-button triggers for up to 4 buttons (P26.4)
      const buttonPressTypes = ['pressed', 'double', 'long', 'triple', 'release'];
      for (let btn = 1; btn <= 4; btn++) {
        for (const pressType of buttonPressTypes) {
          const triggerId = `button_wireless_smart_button_1gang_button_${btn}_${pressType}`;
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
              this.log(`[FLOW] Registered ${triggerId}`);
            }
          } catch (e) {
            // Card doesn't exist for this button - skip silently
          }
        }
      }

      // Battery trigger
      try {
        const batteryCard = this._getFlowCard('button_wireless_smart_battery_low', 'trigger');
        if (batteryCard) {
          batteryCard.registerRunListener(async (args, state) => {
            if (!args.device) { return false; }
            return true;
          });
          this.log('[FLOW] Registered button_wireless_smart_battery_low');
        }
      } catch (e) {
        // Optional
      }

    } catch (err) {
      this.error('[FLOW] Flow card registration failed:', err.message);
    }
  }
}

module.exports = ButtonWirelessSmartDriver;
