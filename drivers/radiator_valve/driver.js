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
    const actions = [
      'radiator_valve_set_target_temperature',
      'radiator_valve_set_temperature'
    ];

    for (const cardId of actions) {
      try {
        const card = this.homey.flow.getActionCard(cardId);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) return false;
            const capability = cardId.includes('target') ? 'target_temperature' : 'target_temperature'; // Both map to target for TRVs
            await args.device.triggerCapabilityListener(capability, args.temperature || args.target_temperature || args.value);
            return true;
          });
          this.log(`[FLOW] ✅ Registered action: ${cardId}`);
        }
      } catch (err) {
        this.log(`[FLOW] ⚠️ Could not register action ${cardId}: ${err.message}`);
      }
    }

    this.log('[FLOW] Radiator valve flow cards registered');
  }
}

module.exports = RadiatorValveDriver;
