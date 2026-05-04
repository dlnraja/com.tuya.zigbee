'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WaterValveGardenDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('WaterValveGardenDriver v7.5.1 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const safeRegister = (type, id, handler) => {
      try {
        const card = type === 'condition' ? this.homey.flow.getConditionCard(id) : this.homey.flow.getActionCard(id);
        if (card) card.registerRunListener(handler);
      } catch (e) { this.log(`[FLOW] Failed to register ${id}: ${e.message}`); }
    };

    safeRegister('condition', 'water_valve_garden_is_open', async (args) => {
      if (!args.device) return false;
      return args.device.getCapabilityValue('onoff') === true;
    });

    safeRegister('action', 'water_valve_garden_open', async (args) => {
      if (!args.device) return false;
      if (typeof args.device._setGangOnOff === 'function') {
        await args.device._setGangOnOff(1, true).catch(() => {});
      }
      await args.device.setCapabilityValue('onoff', true).catch(() => {});
      return true;
    });

    safeRegister('action', 'water_valve_garden_close', async (args) => {
      if (!args.device) return false;
      if (typeof args.device._setGangOnOff === 'function') {
        await args.device._setGangOnOff(1, false).catch(() => {});
      }
      await args.device.setCapabilityValue('onoff', false).catch(() => {});
      return true;
    });

    safeRegister('action', 'water_valve_garden_toggle', async (args) => {
      if (!args.device) return false;
      const cur = args.device.getCapabilityValue('onoff');
      if (typeof args.device.triggerCapabilityListener === 'function') {
        await args.device.triggerCapabilityListener('onoff', !cur).catch(() => {});
      }
      return true;
    });

    this.log('[FLOW] Garden valve flow cards registered');
  }
}

module.exports = WaterValveGardenDriver;