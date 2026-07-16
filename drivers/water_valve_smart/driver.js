'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WaterValveSmartDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('WaterValveSmart driver v7.4.11 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const safeRegister = (id, fn) => {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) card.registerRunListener(fn);
      } catch (err) {
        if (this.developerDebugMode) this.error(`Flow card ${id} error: ${err.message}`);
      }
    };

    safeRegister('water_valve_smart_open', async (args) => {
      if (!args.device) return false;
      await args.device.setValve?.('open').catch(() => {});
      return true;
    });
    safeRegister('water_valve_smart_close', async (args) => {
      if (!args.device) return false;
      await args.device.setValve?.('close').catch(() => {});
      return true;
    });
    safeRegister('water_valve_smart_toggle', async (args) => {
      if (!args.device) return false;
      await args.device.setValve?.('toggle').catch(() => {});
      return true;
    });
    safeRegister('water_valve_smart_set_valve', async (args) => {
      if (!args.device) return false;
      await args.device.setValve?.(args.value).catch(() => {});
      return true;
    });

    this.log('[FLOW] WaterValveSmart flow cards registered');
  }

  async onPairListDevices() {
    return [];
  }
}

module.exports = WaterValveSmartDriver;
