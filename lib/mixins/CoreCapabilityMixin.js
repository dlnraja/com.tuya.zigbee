'use strict';

/**
 * CoreCapabilityMixin - v6.1.1 (P2330)
 *
 * Provides common helper methods to drivers that might not inherit
 * correctly from BaseUnifiedDevice.
 *
 * WHY(P2330): never spray undeclared getDeviceTriggerCard IDs (FLOW-GUARD).
 * Prefer FlowCardHeuristics declared-only + HomeyCompensationLayer.safeGetFlowCard.
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
      if (gangMatch) {gangNum = parseInt(gangMatch[1], 10);}
      else if (legacyMatch) {gangNum = parseInt(legacyMatch[1], 10);}

      const driverId = this.driver?.id;
      if (!driverId || !this.homey?.flow) {return;}

      const stateStr = value ? 'on' : 'off';
      const triggerIds = [
        `${driverId}_gang${gangNum}_turned_${stateStr}`,
        `${driverId}_physical_gang${gangNum}_${stateStr}`,
      ];
      if (gangNum === 1) {
        triggerIds.push(`${driverId}_turned_${stateStr}`);
        triggerIds.push(`${driverId}_physical_${stateStr}`);
      }

      if (typeof this._safeTriggerFlow === 'function') {
        for (const tid of triggerIds) {
          await this._safeTriggerFlow(tid, { gang: gangNum, button: String(gangNum) }, { type: 'core-cap' });
        }
        return;
      }

      const { collectDeclaredFlowIds, findDeclaredCI } = require('../flow/FlowCardHeuristics');
      const { safeGetFlowCard, isNoopFlowCard } = require('../io/HomeyCompensationLayer');
      const declared = collectDeclaredFlowIds(this.homey);
      for (const tid of triggerIds) {
        const resolved = findDeclaredCI(declared, tid);
        if (declared.size && !resolved) {continue;}
        const target = resolved || tid;
        const triggerCard = safeGetFlowCard(this.homey, target, 'trigger', declared.size ? declared : null);
        if (isNoopFlowCard(triggerCard) || typeof triggerCard?.trigger !== 'function') {continue;}
        await triggerCard.trigger(this, { gang: gangNum, button: String(gangNum) }, {}).catch(() => {});
      }
    } catch (err) {
      this.log?.('[CORE-CAP] Initial trigger recovery skipped:', err.message);
    }
  }
};

module.exports = CoreCapabilityMixin;
