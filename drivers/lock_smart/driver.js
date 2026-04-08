'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.574: CRITICAL FIX - Flow card run listeners were missing
 */
class LockSmartDriver extends ZigBeeDriver {
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
    this.log('LockSmartDriver v5.5.574 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Is locked
    try {
      (() => { try { return this.homey.flow.getDeviceConditionCard('lock_smart_is_locked'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('locked') === true;
        });
      this.log('[FLOW] ✅ lock_smart_is_locked');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Lock
    try {
      (() => { try { return this.homey.flow.getDeviceActionCard('lock_smart_lock'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('locked', true);
          return true;
        });
      this.log('[FLOW] ✅ lock_smart_lock');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Unlock
    try {
      (() => { try { return this.homey.flow.getDeviceActionCard('lock_smart_unlock'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('locked', false);
          return true;
        });
      this.log('[FLOW] ✅ lock_smart_unlock');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW]  Smart lock flow cards registered');
  }
}

module.exports = LockSmartDriver;
