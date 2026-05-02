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
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

     // v5.5.533: SDK3 CRITICAL - must call super first!
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
          const card = this._getFlowCard(triggerId, 'trigger');
          if (card) {
            card.registerRunListener(async (args, state) => {
              if (!args.device) {
                this.error(`[FLOW] Device not found for ${triggerId
  
  
  }`);
                return false;
              }
              return true;
            });
            this.log(`[FLOW]  ${triggerId}`);
          }
        } catch (e) {
          this.log(`[FLOW]  ${triggerId} not found`);
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
          const card = this._getFlowCard(triggerId, 'trigger');
          if (card) {
            card.registerRunListener(async (args, state) => {
              if (!args.device) {
                this.error(`[FLOW] Device not found for ${triggerId}`);
                return false;
              }
              return true;
            });
            this.log(`[FLOW]  ${triggerId}`);
          }
        } catch (e) {
          this.log(`[FLOW]  ${triggerId} not found`);
        }
      }

      // Battery trigger
      try {
        const batteryCard = ( () => { try { return this._getFlowCard('battery_alarm_low', 'trigger'); } catch(e) { return null; } } )();
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



