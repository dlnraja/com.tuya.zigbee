'use strict';

/**
 * CoreCapabilityMixin - v6.1.0
 * 
 * Provides common helper methods to drivers that might not inherit 
 * correctly from BaseHybridDevice (e.g. Buttons, Curtains).
 */

const CoreCapabilityMixin = {

  /**
   * Universal Sub-capability Flow Trigger
   */
  async _triggerSubCapabilityFlow(capability, value) {
    try {
      const loader = this.homey?.app?.universalFlowLoader;
      if (loader?.triggerSubCapabilityChanged) {
        await loader.triggerSubCapabilityChanged(this, capability, value);
      }
    } catch (e) { /* ignore */ }
  },

  /**
   * Universal Multi-gang Flow Trigger
   */
  async _triggerGangFlows(capability, value) {
    try {
      const gangMatch = capability.match(/gang(\d+)/);
      const legacyMatch = capability.match(/\.(\d+)$/);
      let gangNum = 1;
      if (gangMatch) gangNum = parseInt(gangMatch[1]);
      else if (legacyMatch) gangNum = parseInt(legacyMatch[1]);
      
      const driverId = this.driver.id;
      const stateStr = value ? 'on' : 'off';
      const triggerId = `${driverId}_gang${gangNum}_turned_${stateStr}`;
      
      const triggerCard = (() => { 
        try { return this.homey.flow.getTriggerCard(triggerId); } 
        catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } 
      })();
      if (triggerCard) {
        await triggerCard.trigger(this, {}, {}).catch(() => {});
        this.log?.(`[GA-FLOW] ⚡ Triggered gang ${gangNum} ${stateStr}`);
      }

      // v7.0.18: LEGACY FLOW MIGRATION
      const { getLegacyDriverIds } = require('../utils/migration-queue');
      const legacyDriverIds = getLegacyDriverIds(driverId);
      for (const legacyId of legacyDriverIds) {
        const legacyTriggerId = triggerId.replace(driverId, legacyId);
        try {
          const legacyCard = this.homey.flow.getTriggerCard(legacyTriggerId);
          if (legacyCard) {
            this.log?.(`[GA-FLOW-MIGRATION] 🔄 Triggering legacy gang flow: ${legacyTriggerId}`);
            await legacyCard.trigger(this, {}, {}).catch(() => {});
          }
        } catch (e) {
          // Legacy card not in app.json, skip
        }
      }
    } catch (err) { /* ignore */ }
  }

};

module.exports = CoreCapabilityMixin;

