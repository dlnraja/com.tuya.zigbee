'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LockSmartDriver extends ZigBeeDriver {
async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('LockSmartDriver v5.5.574 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS

    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('lock_locked');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition lock_smart_is_locked: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('lock_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition lock_smart_tamper_active: ${err.message}`); }; }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('lock_smart_unlock');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          if (typeof args.device.unlock === 'function') {await args.device.unlock().catch(() => {});}
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action lock_smart_unlock: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('lock_smart_lock');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          if (typeof args.device.lock === 'function') {await args.device.lock().catch(() => {});}
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action lock_smart_lock: ${err.message}`); }; }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = LockSmartDriver;
