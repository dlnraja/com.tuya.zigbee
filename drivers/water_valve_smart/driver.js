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
    try {
      const card = this.homey.flow.getActionCard('water_valve_smart_set_valve');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setValve(args.value).catch(() => {});
          return true;
        });
      }
    } catch (err) {
      this.error(`Flow card error: ${err.message}`);
    }
    this.log('[FLOW] WaterValveSmart flow cards registered');
  }

  async onPairListDevices() {
    return [];
  }
}

module.exports = WaterValveSmartDriver;
