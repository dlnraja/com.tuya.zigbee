'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.832: SOS Emergency Button Driver - FLOW FIX ENHANCED
 * Fixed: Flow card not triggering (Peter_van_Werkhoven forum #1203)
 */
class SosEmergencyButtonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SosEmergencyButtonDriver v5.5.832 initialized');
    
    // v5.5.832: Register flow trigger card
    try {
      this._sosFlowCard = this.homey.flow.getTriggerCard('button_emergency_sos_pressed');
      if (this._sosFlowCard) {
        this._sosFlowCard.registerRunListener(async (args, state) => {
          this.log('[FLOW] 🎯 RunListener called - returning true');
          return true;
        });
        this.log('[FLOW] ✅ button_emergency_sos_pressed card registered');
      } else {
        this.log('[FLOW] ⚠️ button_emergency_sos_pressed card not found');
      }
    } catch (e) {
      this.error('[FLOW] ❌ Flow card registration error:', e.message);
    }
  }

  /**
   * v5.5.826: Trigger SOS flow from device.js
   */
  async triggerSOS(device, tokens = {}, state = {}) {
    this.log('[FLOW] 🆘 triggerSOS called for', device.getName());
    
    // Set capability first
    await device.setCapabilityValue('alarm_generic', true).catch(e =>
      this.error('[FLOW] ❌ alarm_generic set error:', e.message)
    );
    
    // v5.5.826: Trigger flow card explicitly
    if (this._sosFlowCard) {
      try {
        await this._sosFlowCard.trigger(device, tokens, state);
        this.log('[FLOW] ✅ button_emergency_sos_pressed triggered!');
      } catch (e) {
        this.error('[FLOW] ❌ Flow trigger error:', e.message);
      }
    } else {
      // Fallback
      try {
        const card = this.homey.flow.getTriggerCard('button_emergency_sos_pressed');
        if (card) {
          await card.trigger(device, tokens, state);
          this.log('[FLOW] ✅ button_emergency_sos_pressed triggered (fallback)!');
        }
      } catch (e) {
        this.error('[FLOW] ❌ Fallback trigger error:', e.message);
      }
    }
  }
}

module.exports = SosEmergencyButtonDriver;
