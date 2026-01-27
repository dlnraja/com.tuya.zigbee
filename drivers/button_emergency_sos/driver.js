'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.832: SOS Emergency Button Driver - FLOW FIX ENHANCED
 * Fixed: Flow card not triggering (Peter_van_Werkhoven forum #1203)
 * v5.5.832: Added registerRunListener and enhanced error diagnostics
 */
class SosEmergencyButtonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SosEmergencyButtonDriver v5.5.832 initialized');
    
    // v5.5.832: Register flow trigger card with registerRunListener
    try {
      this._sosFlowCard = this.homey.flow.getDeviceTriggerCard('button_emergency_sos_pressed');
      if (this._sosFlowCard) {
        // v5.5.832: CRITICAL - Register run listener for trigger cards
        this._sosFlowCard.registerRunListener(async (args, state) => {
          this.log('[FLOW] 🎯 RunListener called - returning true');
          return true; // Always allow trigger
        });
        this.log('[FLOW] ✅ button_emergency_sos_pressed card registered with runListener');
      } else {
        this.log('[FLOW] ⚠️ button_emergency_sos_pressed card not found - check driver.flow.compose.json');
      }
    } catch (e) {
      this.log('[FLOW] ❌ Flow card registration error:', e.message);
    }
  }

  /**
   * v5.5.826: Trigger SOS flow from device.js - FIXED
   * Now properly triggers the flow card
   */
  async triggerSOS(device, tokens = {}, state = {}) {
    this.log('[FLOW] 🆘 triggerSOS called for', device.getName());
    
    // Set capability first
    await device.setCapabilityValue('alarm_generic', true).catch(e =>
      this.log('[FLOW] ❌ alarm_generic set error:', e.message)
    );
    
    // v5.5.826: Trigger flow card explicitly
    if (this._sosFlowCard) {
      try {
        await this._sosFlowCard.trigger(device, tokens, state);
        this.log('[FLOW] ✅ button_emergency_sos_pressed triggered!');
      } catch (e) {
        this.log('[FLOW] ❌ Flow trigger error:', e.message);
      }
    } else {
      // Fallback: try to get card again
      try {
        const card = this.homey.flow.getDeviceTriggerCard('button_emergency_sos_pressed');
        if (card) {
          await card.trigger(device, tokens, state);
          this.log('[FLOW] ✅ button_emergency_sos_pressed triggered (fallback)!');
        }
      } catch (e) {
        this.log('[FLOW] ❌ Fallback trigger error:', e.message);
      }
    }
  }
}

module.exports = SosEmergencyButtonDriver;
