'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.832: SOS Emergency Button Driver - FLOW FIX ENHANCED
 * Fixed: Flow card not triggering (Peter_van_Werkhoven forum #1203)
 */
class SosEmergencyButtonDriver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
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

    try {
      this._sosFlowCard = (() => { try { return this.homey.flow.getTriggerCard('button_emergency_sos_pressed'); } catch (e) { return null; } })();
      if (this._sosFlowCard) {
        this._sosFlowCard.registerRunListener(async (args, state) => {
          return true;
        });
      }

      this._doublePressCard = (() => { try { return this.homey.flow.getTriggerCard('button_emergency_sos_double_pressed'); } catch (e) { return null; } })();
      this._longPressCard = (() => { try { return this.homey.flow.getTriggerCard('button_emergency_sos_long_pressed'); } catch (e) { return null; } })();
      
      this.log('SosEmergencyButtonDriver initialized');
    } catch (e) {
      this.error('[FLOW] Flow card registration error:', e.message);
    }
  }

  /**
   * Trigger SOS flow from device.js
   */
  async triggerSOS(device, tokens = {}, state = {}) {
    this.log('[FLOW] triggerSOS called for', device.getName());
    
    // Set capability first
    await device.setCapabilityValue('alarm_generic', true).catch(e => {
      this.log('[FLOW] alarm_generic set error:', e.message);
    });
    
    if (this._sosFlowCard) {
      try {
        await this._sosFlowCard.trigger(device, tokens, state);
      } catch (e) {
        this.log('[FLOW] Flow trigger error:', e.message);
      }
    }
  }

  async triggerDoublePress(device, tokens = {}, state = {}) {
    if (this._doublePressCard) {
      await this._doublePressCard.trigger(device, tokens, state).catch(e => this.error(e));
    }
  }

  async triggerLongPress(device, tokens = {}, state = {}) {
    if (this._longPressCard) {
      await this._longPressCard.trigger(device, tokens, state).catch(e => this.error(e));
    }
  }
}

module.exports = SosEmergencyButtonDriver;
