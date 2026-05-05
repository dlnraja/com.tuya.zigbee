'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class RadiatorValveDriver extends ZigBeeDriver {
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
    this.log('RadiatorValveDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const P = 'radiator_valve';
    const actions = ['set_target_temperature', 'set_temperature'];

    // Safe card getter
    const safeGet = (type, id) => {
      try {
        return type === 'condition'
          ? this.homey.flow.getConditionCard(id)
          : this.homey.flow.getActionCard(id);
      } catch (e) { return null; }
    };

    actions.forEach(act => {
      try {
        const id = `${P}_${act}`;
        const card = safeGet('action', id);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) return false;
            const val = args.temperature || args.target_temperature || args.value;
            await args.device.triggerCapabilityListener('target_temperature', val);
            return true;
          });
          this.log(`[FLOW] Registered: ${id}`);
        }
      } catch (err) { this.error(`Action ${act} failed:`, err.message); }
    });
  }
}

module.exports = RadiatorValveDriver;
