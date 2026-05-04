'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchPlug2Driver extends ZigBeeDriver {
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

    this.log('SwitchPlug2Driver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const P = 'switch_plug_2';

    // ACTIONS
    ['turn_on', 'turn_off', 'toggle'].forEach(action => {
      try {
        const id = `${P}_${action}`;
        const card = this._getFlowCard(id, 'action');
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) return false;
            let val = action === 'turn_on' ? true : (action === 'turn_off' ? false : !args.device.getCapabilityValue('onoff'));
            await args.device.triggerCapabilityListener('onoff', val);
            return true;
          });
        }
      } catch (err) { this.error(`Action ${action} failed: ${err.message}`); }
    });

    this.log('[FLOW] Plug 2 flow cards registered');
  }
}

module.exports = SwitchPlug2Driver;
