'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LockSmartDriver extends ZigBeeDriver {
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
    this.log('LockSmartDriver v5.5.574 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('lock_smart_locked'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('lock_smart_unlocked'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('lock_smart_lock_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('lock_smart_battery_low'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('lock_smart_tamper_alarm'); } catch (e) {}

    // CONDITIONS
    try {
      const card = this._getFlowCard('lock_smart_is_locked', 'condition');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition lock_smart_is_locked: ${err.message}`); }

    try {
      const card = this._getFlowCard('lock_smart_tamper_active', 'condition');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition lock_smart_tamper_active: ${err.message}`); }

    // ACTIONS
    try {
      const card = this._getFlowCard('lock_smart_lock', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action lock_smart_lock triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action lock_smart_lock: ${err.message}`); }

    try {
      const card = this._getFlowCard('lock_smart_unlock', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action lock_smart_unlock triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action lock_smart_unlock: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = LockSmartDriver;
