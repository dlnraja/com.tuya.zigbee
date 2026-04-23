'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.832: SOS Emergency Button Driver - FLOW FIX ENHANCED
 * Fixed: Flow card not triggering (Peter_van_Werkhoven forum #1203)
 * v5.5.832: Added registerRunListener and enhanced error diagnostics
 */
class SosEmergencyButtonDriver extends ZigBeeDriver {
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

    this._longPressCard = (() => { try { return this.homey.flow.getTriggerCard('button_emergency_sos_long_pressed'); 
  
  } catch(e) { return null; } })();
    this._doublePressCard = (() => { try { return this.homey.flow.getTriggerCard('button_emergency_sos_double_pressed'); } catch(e) { return null; } })();
    this.log('SosEmergencyButtonDriver v5.5.832 initialized');
    
    // v5.5.832: Register flow trigger card with registerRunListener
    try {
      this._sosFlowCard = (() => { try { return this.homey.flow.getTriggerCard('button_emergency_sos_pressed'); } catch(e) { return null; } })();
      if (this._sosFlowCard) {
        this._sosFlowCard.registerRunListener(async (args, state) => {
          this.log('[FLOW]  RunListener called - returning true');
          return true; // Always allow trigger
        
  });
        this.log('[FLOW]  button_emergency_sos_pressed card registered with runListener');
      } else {
        this.log('[FLOW]  button_emergency_sos_pressed card not found - check driver.flow.compose.json');
      }
    } catch (e) {
      this.log('[FLOW]  Flow card registration error:', e.message);
    }
  }

  /**
   * v5.5.826: Trigger SOS flow from device.js - FIXED
   * Now properly triggers the flow card
   */
  async triggerSOS(device, tokens = {}, state = {}) {
    this.log('[FLOW]  triggerSOS called for', device.getName());
    
    // Set capability first
    await device.setCapabilityValue('alarm_generic', true).catch(e => {
      this.log('[FLOW]  alarm_generic set error:', e.message)
    });
    
    // v5.5.826: Trigger flow card explicitly
    if (this._sosFlowCard) {
      try {
        await this._sosFlowCard.trigger(device, tokens, state);
        this.log('[FLOW]  button_emergency_sos_pressed triggered!');
      } catch (e) {
        this.log('[FLOW]  Flow trigger error:', e.message);
      }
    } else {
      // Fallback: try to get card again
      try {
        const card = (() => { try { return this.homey.flow.getTriggerCard('button_emergency_sos_pressed'); } catch(e) { return null; } })();
        if (card) {
          await card.trigger(device, tokens, state);
          this.log('[FLOW]  button_emergency_sos_pressed triggered (fallback)!');
        }
      } catch (e) {
        this.log('[FLOW]  Fallback trigger error:', e.message);
      }
    }
  }
}

module.exports = SosEmergencyButtonDriver;

