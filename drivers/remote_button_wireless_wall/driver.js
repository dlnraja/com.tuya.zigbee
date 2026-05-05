'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v7.5.9: Remote Button Wireless Wall Driver - FIXED to use SDK3 API
 * CRITICAL: Use homey.flow.getTriggerCard() instead of _getFlowCard()
 */
class RemoteWallDriver extends ZigBeeDriver {
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

    this.log('RemoteWallDriver v7.5.9 initialized');

    // Safe trigger getter
    const safeTrigger = (id) => {
      try { return this.homey.flow.getTriggerCard(id); } catch(e) { return null; }
    };

    try {
      // Main triggers
      const mainTriggers = [
        'remote_button_wireless_wall_button_wall_button_pressed',
        'remote_button_wireless_wall_button_wall_button_double_press',
        'remote_button_wireless_wall_button_wall_button_long_press',
        'remote_button_wireless_wall_button_wall_button_multi_press'
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

module.exports = RemoteWallDriver;