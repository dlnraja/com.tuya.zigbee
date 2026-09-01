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
      'button_emergency_sos_battery_low',
      // WHY(P2364): triggerSOS fires physical_on — must be registered or fallback races manifest
      'button_emergency_sos_physical_on',
      'button_emergency_sos_physical_off',
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
        this.log(`[FLOW] ${cardId} registration skipped:`, e.message);
      }
    }
  }

  /**
   * v5.5.833: Trigger SOS flow from device.js
   */
  async triggerSOS(device, tokens = {}, state = {}) {
    this.log('[FLOW] triggerSOS called for', device.getName());

    // WHY: these cards declare no tokens. Passing { source } makes Homey
    // reject the trigger ("invalid tokens") so Flows never fire.
    await this._triggerCard('button_emergency_sos_pressed', device, {}, state);
    await this._triggerCard('button_emergency_sos_physical_on', device, {}, state);
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
   * P2364: alarm_generic auto-reset should pair with physical_off for Flow parity.
   */
  async triggerPhysicalOff(device, tokens = {}, state = {}) {
    this.log('[FLOW] triggerPhysicalOff called for', device.getName());
    await this._triggerCard('button_emergency_sos_physical_off', device, {}, state);
  }

  /**
   * v5.5.833: Trigger battery low flow
   */
  async triggerBatteryLow(device, tokens = {}, state = {}) {
    // WHY: Peter #2190 / 0cea6870 — SOS battery jumped 11%→20% in <100ms and
    // fired battery_low twice. Debounce identical flow spam for 60s.
    const now = Date.now();
    const last = device.getStoreValue?.('sos_battery_low_flow_at') || 0;
    if (now - last < 60_000) {
      this.log('[FLOW] triggerBatteryLow debounced for', device.getName());
      return;
    }
    try { await device.setStoreValue?.('sos_battery_low_flow_at', now); } catch (_e) { /* ignore */ }
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
        this.log(`[FLOW] ${cardId} trigger skipped:`, e.message);
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
        this.log(`[FLOW] ${cardId} fallback skipped:`, e.message);
      }
    }
  }
}

module.exports = SosEmergencyButtonDriver;
