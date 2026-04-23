'use strict';

/**
 * CoreCapabilityMixin - v6.1.0
 * 
 * Provides common helper methods to drivers that might not inherit 
 * correctly from BaseUnifiedDevice.
 */

const CoreCapabilityMixin = {

  async _triggerSubCapabilityFlow(capability, value) {
    try {
      const loader = this.homey?.app?.universalFlowLoader;
      if (loader?.triggerSubCapabilityChanged) {
        await loader.triggerSubCapabilityChanged(this, capability, value);
      }
    } catch (e) { /* ignore */ }
  },

  async _triggerGangFlows(capability, value) {
    try {
      const gangMatch = capability.match(/gang(\d+)/);
      const legacyMatch = capability.match(/\.(\d+)$/);
      let gangNum = 1;
      if (gangMatch) gangNum = parseInt(gangMatch[1], 10);
      else if (legacyMatch) gangNum = parseInt(legacyMatch[1], 10);
      
      const driverId = this.driver?.id;
      if (!driverId) return;

      const stateStr = value ? 'on' : 'off';
      const triggerIds = new Set();
      
      // Pattern 1: switch_3gang_gang1_turned_on (Standard)
      triggerIds.add(`${driverId}_gang${gangNum}_turned_${stateStr}`);
      
      // Pattern 2: switch_3gang_physical_gang1_on (TS0003/Issue #170)
      triggerIds.add(`${driverId}_physical_gang${gangNum}_${stateStr}`);
      
      if (gangNum === 1) {
        // Pattern 3: switch_3gang_turned_on (Root)
        triggerIds.add(`${driverId}_turned_${stateStr}`);
        // Pattern 4: switch_3gang_physical_on (Root physical)
        triggerIds.add(`${driverId}_physical_${stateStr}`);
      }

      for (const tid of triggerIds) {
        try {
          const triggerCard = (() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })();
          if (triggerCard) {
            await triggerCard.trigger(this, {}, {}).catch(() => {});
          }
        } catch (err) {}
      }
    } catch (err) {}
  }
};

module.exports = CoreCapabilityMixin;
