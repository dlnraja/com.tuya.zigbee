'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.147: SOS Emergency Button Driver with EXPLICIT flow card registration
 */
class SosEmergencyButtonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SosEmergencyButtonDriver v5.5.147 initializing...');

    // v5.5.147: EXPLICIT registration of ALL flow triggers
    await this._registerFlowTriggers();

    this.log('SosEmergencyButtonDriver initialized');
  }

  /**
   * v5.5.147: Register flow triggers explicitly
   */
  async _registerFlowTriggers() {
    const triggers = [
      'button_emergency_sos_pressed',
      'sos_button_pressed'
    ];

    for (const triggerId of triggers) {
      try {
        const card = this.homey.flow.getDeviceTriggerCard(triggerId);
        if (card) {
          // Register run listener (always returns true for simple triggers)
          card.registerRunListener(async (args, state) => {
            this.log(`[FLOW] RunListener called for ${triggerId}`);
            return true;
          });

          // Store reference for device.js
          if (triggerId === 'button_emergency_sos_pressed') {
            this.sosButtonPressedTrigger = card;
          }
          if (triggerId === 'sos_button_pressed') {
            this.sosGenericTrigger = card;
          }

          this.log(`[FLOW] ✅ ${triggerId} registered`);
        } else {
          this.log(`[FLOW] ⚠️ ${triggerId} card not found`);
        }
      } catch (e) {
        this.log(`[FLOW] ❌ ${triggerId} error:`, e.message);
      }
    }
  }

  /**
   * v5.5.147: Trigger SOS flow from device
   */
  triggerSOS(device, tokens = {}, state = {}) {
    this.log('[FLOW] 🆘 triggerSOS called');

    // Trigger both cards
    if (this.sosButtonPressedTrigger) {
      this.sosButtonPressedTrigger.trigger(device, tokens, state)
        .then(() => this.log('[FLOW] ✅ button_emergency_sos_pressed triggered'))
        .catch(e => this.log('[FLOW] ❌ button_emergency_sos_pressed error:', e.message));
    }

    if (this.sosGenericTrigger) {
      this.sosGenericTrigger.trigger(device, tokens, state)
        .then(() => this.log('[FLOW] ✅ sos_button_pressed triggered'))
        .catch(e => this.log('[FLOW] ❌ sos_button_pressed error:', e.message));
    }
  }
}

module.exports = SosEmergencyButtonDriver;
