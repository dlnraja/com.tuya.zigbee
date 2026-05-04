'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaZigbeeSwitchDriver extends ZigBeeDriver {
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
    this.log('Tuya Zigbee Switch Driver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const safeGet = (type, id) => {
      try {
        return type === 'condition' 
          ? this.homey.flow.getConditionCard(id) 
          : this.homey.flow.getActionCard(id);
      } catch (e) { return null; }
    };

    const P = 'switch';
    
    // CONDITIONS: switch_hybrid_switch_X_gang1_is_on
    try {
      const card = safeGet('condition', 'switch_hybrid_switch_1_gang1_is_on');
      if (card) card.registerRunListener(async (args) => {
        if (!args.device) return false;
        return args.device.getCapabilityValue('onoff') === true;
      });
    } catch (err) { this.error(`Condition gang1_is_on failed: ${err.message}`); }

    try {
      const card = safeGet('condition', 'switch_hybrid_switch_1_gang2_is_on');
      if (card) card.registerRunListener(async (args) => {
        if (!args.device) return false;
        return args.device.getCapabilityValue('onoff.gang2') === true;
      });
    } catch (err) { this.error(`Condition gang2_is_on failed: ${err.message}`); }

    // ACTIONS
    const actions = ['turn_on', 'turn_off', 'toggle'];
    const gangs = ['gang1', 'gang2'];

    gangs.forEach((gang, idx) => {
      const cap = idx === 0 ? 'onoff' : `onoff.gang${idx + 1}`;
      actions.forEach(action => {
        try {
          const id = `switch_hybrid_${action}_${gang}`;
          const card = safeGet('action', id);
          if (card) {
            card.registerRunListener(async (args) => {
              if (!args.device) return false;
              let val;
              if (action === 'turn_on') val = true;
              else if (action === 'turn_off') val = false;
              else val = !args.device.getCapabilityValue(cap);
              await args.device.triggerCapabilityListener(cap, val).catch(() => {});
              return true;
            });
          }
        } catch (err) { this.error(`Action ${action}_${gang} failed: ${err.message}`); }
      });
    });

    this.log('[FLOW] Switch flow cards registered');
  }
}

module.exports = TuyaZigbeeSwitchDriver;