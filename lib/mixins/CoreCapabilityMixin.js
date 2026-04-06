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
      
      const triggerCard = this.homey.flow.getTriggerCard(triggerId);
      if (triggerCard) {
        await triggerCard.trigger(this, {}, {}).catch(() => {});
        this.log?.(`[GA-FLOW] ⚡ Triggered gang ${gangNum} ${stateStr}`);
      }
    } catch (err) { /* ignore */ }
  }

};

module.exports = CoreCapabilityMixin;

