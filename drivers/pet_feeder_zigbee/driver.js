'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class PetFeederZigbeeDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;

    try {
      const card = this.homey.flow.getActionCard('pet_feeder_zigbee_feed');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) { return false; }
          if (typeof args.device.triggerCapabilityListener === 'function'
              && args.device.hasCapability?.('button')) {
            try {
              await args.device.triggerCapabilityListener('button');
              return true;
            } catch (_) { /* fall through */ }
          }
          if (typeof args.device.sendTuyaCommand === 'function') {
            await args.device.sendTuyaCommand(4, 1, 'value').catch(() => {});
            return true;
          }
          if (args.device.io?.sendDP) {
            await args.device.io.sendDP(4, 1, { type: 'value' }).catch(() => {});
            return true;
          }
          return true;
        });
      }
    } catch (err) {
      this.log(`[FLOW] pet_feeder_zigbee_feed: ${err.message}`);
    }
    this.log('[FLOW] Pet feeder feed action registered (P130)');
  }
}

module.exports = PetFeederZigbeeDriver;
