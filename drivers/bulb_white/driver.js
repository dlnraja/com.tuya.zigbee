'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerOnoffFlowCards, setActuatorCapability } = require('../../lib/flow/ActuatorFlowHelper');

/**
 * P130: Flow card IDs must match driver.flow.compose.json (bulb_white_*),
 * not the old bulb_white_smart_bulb_white_* prefix.
 */
class SmartBulbWhiteDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerOnoffFlowCards(this, 'bulb_white', { registerDim: true });

    try {
      const card = this.homey.flow.getActionCard('bulb_white_set_brightness');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) { return false; }
          const raw = args.brightness ?? args.dim ?? args.value;
          if (raw == null) { return false; }
          return setActuatorCapability(args.device, 'dim', Number(raw));
        });
      }
    } catch (err) {
      this.log(`[FLOW] bulb_white_set_brightness: ${err.message}`);
    }

    this.log('[FLOW] White bulb flow cards registered (P130)');
  }
}

module.exports = SmartBulbWhiteDriver;
