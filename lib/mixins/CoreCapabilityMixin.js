'use strict';

/**
 * CoreCapabilityMixin - v6.1.0
 * 
 * Provides common helper methods to drivers that might not inherit 
 * correctly from BaseUnifiedDevice (e.g. Buttons, Curtains).
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
      // 1. Determine Gang Number and State
      // Supports formats: onoff (gang 1), onoff.gang2, onoff.2
      const gangMatch = capability.match(/gang(\d+)/);
      const legacyMatch = capability.match(/\.(\d+)$/);
      let gangNum = 1;
      if (gangMatch) gangNum = parseInt(gangMatch[1], 10);
      else if (legacyMatch) gangNum = parseInt(legacyMatch[1], 10);
      
      const driverId = this.driver?.id;
      if (!driverId) return;

      const stateStr = value ? 'on' : 'off';
      const shortState = value ? 'on' : 'off'; // For 'physical_on' format
      
      // 2. Build collection of candidate Trigger IDs
      // v7.1.0: Multi-path triggering ensures compatibility across all driver manifest styles (Fix #170)
      const triggerIds = new Set();
      
      // Pattern A: Generic Gang (The current standard: switch_3gang_gang2_turned_on)
      triggerIds.add(`${driverId}_gang${gangNum}_turned_${stateStr}`);
      
      // Pattern B: Physical Button (Common in older manifests: switch_3gang_physical_gang2_on)
      triggerIds.add(`${driverId}_physical_gang${gangNum}_${shortState}`);
      
      // Pattern C: Main Gang specific aliases (For gang 1, often untagged: switch_3gang_turned_on)
      if (gangNum === 1) {
        triggerIds.add(`${driverId}_turned_${stateStr}`);
        triggerIds.add(`${driverId}_physical_${shortState}`);
        triggerIds.add(`${driverId}_physical_gang1_${shortState}`);
      }

      // 3. Add Legacy Migration IDs (for old apps or during driver renames)
      try {
        const { getLegacyDriverIds } = require('../utils/migration-queue');
        const legacyDriverIds = (typeof getLegacyDriverIds === 'function') ? getLegacyDriverIds(driverId) : [];
        for (const legacyId of legacyDriverIds) {
          triggerIds.add(`${legacyId}_gang${gangNum}_turned_${stateStr}`);
          triggerIds.add(`${legacyId}_physical_gang${gangNum}_${shortState}`);
          if (gangNum === 1) {
            triggerIds.add(`${legacyId}_turned_${stateStr}`);
          }
        }
      } catch (migErr) { /* Migration queue may not exist in all environments */ }

      // 4. Execute all valid triggers found in the app manifest
      for (const tid of triggerIds) {
        try {
          // Use safe getter from Homey App if available, else standard fallback
          const triggerCard = (() => {
            try { 
              if (this.homey?.app?._safeGetTriggerCard) return this.homey.app._safeGetTriggerCard(tid);
              return this.homey.flow.getTriggerCard(tid); 
            } catch (e) { return null; }
          })();

          if (triggerCard) {
            // this.log?.(`[GA-FLOW] ⚡ Triggering card: ${tid}`);
            await triggerCard.trigger(this, {}, {}).catch(err => 
              this.error?.(`[GA-FLOW] ❌ Trigger failed for ${tid}:`, err.message)
            );
          }
        } catch (cardErr) { /* Skip invalid cards */ }
      }
    } catch (err) {
      if (this.error) this.error(`[GA-FLOW] Critical error: ${err.message}`);
    }
  }

};

module.exports = CoreCapabilityMixin;

