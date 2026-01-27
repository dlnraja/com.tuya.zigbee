'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.826: SOS Emergency Button Driver - FLOW FIX
 * Fixed: Flow card not triggering (Peter's diagnostics report)
 */
class SosEmergencyButtonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SosEmergencyButtonDriver v5.5.826 initialized');
    
    // v5.5.826: Register flow trigger card explicitly
    this._sosFlowCard = this.homey.flow.getDeviceTriggerCard('button_emergency_sos_pressed');
    if (this._sosFlowCard) {
      this.log('[FLOW] ✅ button_emergency_sos_pressed card registered');
    } else {
      this.log('[FLOW] ⚠️ button_emergency_sos_pressed card not found');
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
