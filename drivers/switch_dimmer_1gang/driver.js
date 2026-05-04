'use strict';

const { safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchDimmer1GangDriver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
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
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('Switch Dimmer 1-Gang Driver initialized');
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

    const P = 'switch_dimmer_1gang';

    // CONDITIONS
    try {
      const card = safeGet('condition', `${P}_is_on`);
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition is_on failed: ${err.message}`); }

    // ACTIONS: set_brightness
    try {
      const card = safeGet('action', `${P}_set_brightness`);
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const dim = safeParse(args.brightness || args.value, 100) / 100;
          await args.device.triggerCapabilityListener('dim', dim);
          return true;
        });
      }
    } catch (err) { this.error(`Action set_brightness failed: ${err.message}`); }

    // ACTIONS: turn_on
    try {
      const card = safeGet('action', `${P}_turn_on`);
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action turn_on failed: ${err.message}`); }

    // ACTIONS: turn_off
    try {
      const card = safeGet('action', `${P}_turn_off`);
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action turn_off failed: ${err.message}`); }

    // ACTIONS: toggle
    try {
      const card = safeGet('action', `${P}_toggle`);
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action toggle failed: ${err.message}`); }

    this.log('[FLOW] Dimmer flow cards registered');
  }
}

module.exports = SwitchDimmer1GangDriver;