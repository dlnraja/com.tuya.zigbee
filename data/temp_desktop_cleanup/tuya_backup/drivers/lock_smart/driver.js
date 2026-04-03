'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.574: CRITICAL FIX - Flow card run listeners were missing
 */
class LockSmartDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LockSmartDriver v5.5.574 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Is locked
    try {
      this.homey.flow.getConditionCard('lock_smart_is_locked')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('locked') === true;
        });
      this.log('[FLOW] ✅ lock_smart_is_locked');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Lock
    try {
      this.homey.flow.getActionCard('lock_smart_lock')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('locked', true);
          return true;
        });
      this.log('[FLOW] ✅ lock_smart_lock');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Unlock
    try {
      this.homey.flow.getActionCard('lock_smart_unlock')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('locked', false);
          return true;
        });
      this.log('[FLOW] ✅ lock_smart_unlock');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] 🎉 Smart lock flow cards registered');
  }
}

module.exports = LockSmartDriver;
