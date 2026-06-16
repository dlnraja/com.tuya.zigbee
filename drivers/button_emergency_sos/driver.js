'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.833: SOS Emergency Button Driver - ALL FLOW CARDS
 * Fixed: Flow card not triggering (Peter_van_Werkhoven forum #1203)
 * Added: Double-press, long-press, battery_low flow triggers
 */
class SosEmergencyButtonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SosEmergencyButtonDriver v5.5.833 initialized');

    // v5.5.832: Register ALL flow trigger cards
    const triggerCards = [
      'button_emergency_sos_pressed',
      'button_emergency_sos_double_pressed',
      'button_emergency_sos_long_pressed',
      'button_emergency_sos_battery_low'
    ];

    this._flowCards = {};
    for (const cardId of triggerCards) {
      try {
        const card = this.homey.flow.getDeviceTriggerCard(cardId);
        if (card) {
          card.registerRunListener(async (args, state) => {
            this.log(`[FLOW] RunListener called for ${cardId} - returning true`);
            return true;
          });
          this._flowCards[cardId] = card;
          this.log(`[FLOW] ${cardId} card registered`);
        } else {
          this.log(`[FLOW] ${cardId} card not found in app manifest`);
        }
      } catch (e) {
        this.error(`[FLOW] ${cardId} registration error:`, e.message);
      }
    }
  }

  /**
   * v5.5.833: Trigger SOS flow from device.js
   */
  async triggerSOS(device, tokens = {}, state = {}) {
    this.log('[FLOW] triggerSOS called for', device.getName());

    // v5.5.833: Trigger flow card explicitly with source tokens
    await this._triggerCard('button_emergency_sos_pressed', device, tokens, state);
  }

  /**
   * v5.5.833: Trigger double-press flow
   */
  async triggerDoublePress(device, tokens = {}, state = {}) {
    this.log('[FLOW] triggerDoublePress called for', device.getName());
    await this._triggerCard('button_emergency_sos_double_pressed', device, tokens, state);
  }

  /**
   * v5.5.833: Trigger long-press flow
   */
  async triggerLongPress(device, tokens = {}, state = {}) {
    this.log('[FLOW] triggerLongPress called for', device.getName());
    await this._triggerCard('button_emergency_sos_long_pressed', device, tokens, state);
  }

  /**
   * v5.5.833: Trigger battery low flow
   */
  async triggerBatteryLow(device, tokens = {}, state = {}) {
    this.log('[FLOW] triggerBatteryLow called for', device.getName());
    await this._triggerCard('button_emergency_sos_battery_low', device, tokens, state);
  }

  /**
   * v5.5.833: Central card trigger with fallback
   */
  async _triggerCard(cardId, device, tokens, state) {
    const card = this._flowCards?.[cardId];
    if (card) {
      try {
        await card.trigger(device, tokens, state);
        this.log(`[FLOW] ${cardId} triggered successfully`);
      } catch (e) {
        this.error(`[FLOW] ${cardId} trigger error:`, e.message);
      }
    } else {
      // Fallback: re-fetch card from runtime
      try {
        const fallbackCard = this.homey.flow.getDeviceTriggerCard(cardId);
        if (fallbackCard) {
          await fallbackCard.trigger(device, tokens, state);
          this.log(`[FLOW] ${cardId} triggered (fallback)`);
        } else {
          this.log(`[FLOW] ${cardId} card not available`);
        }
      } catch (e) {
        this.error(`[FLOW] ${cardId} fallback error:`, e.message);
      }
    }
  }
}

module.exports = SosEmergencyButtonDriver;
