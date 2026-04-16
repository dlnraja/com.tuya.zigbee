'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.572: CRITICAL FIX - Flow card run listeners were missing
 */
class RadiatorValveDriver extends ZigBeeDriver {
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

    this.log('RadiatorValveDriver v5.5.572 initialized');
    this._registerFlowCards();
  
  
  
  
  
  
  
  }

  _registerFlowCards() {
    // ACTION: Set target temperature
    try {
      (() => { try { return this.homey.flow.getActionCard('radiator_valve_set_target_temperature'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('target_temperature', args.temperature);
          return true;
        });
      this.log('[FLOW] ✅ Registered: radiator_valve_set_target_temperature');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW]  Radiator valve flow cards registered');
  }
}

module.exports = RadiatorValveDriver;
