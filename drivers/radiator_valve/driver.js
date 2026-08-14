'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');

class RadiatorValveDriver extends BaseZigBeeDriver {
async onInit() {
    /* P131-AUTO-FLOW-LISTENERS */

    try {
      const __card = this.homey.flow.getActionCard('radiator_valve_set_target_temperature');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const raw = args.temperature ?? args.brightness ?? args.dim ?? args.value ?? args.speed;
          if (raw === undefined) return false;
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('target_temperature', raw).catch(() => {});
          } else {
            await args.device.setCapabilityValue('target_temperature', raw).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] radiator_valve_set_target_temperature:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('radiator_valve_set_temperature');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const raw = args.temperature ?? args.brightness ?? args.dim ?? args.value ?? args.speed;
          if (raw === undefined) return false;
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('target_temperature', raw).catch(() => {});
          } else {
            await args.device.setCapabilityValue('target_temperature', raw).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] radiator_valve_set_temperature:', e.message); }
    /* P131-AUTO-FLOW-LISTENERS-END */

    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('RadiatorValveDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const P = 'radiator_valve';
    const actions = ['set_target_temperature', 'set_temperature'];

    actions.forEach(act => {
      try {
        const id = `${P}_${act}`;
        const card = this._getFlowCard(id, 'action');
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) {return false;}
            const val = args.temperature || args.target_temperature || args.value;
            await args.device['setCapabilityValue']('target_temperature', val);
            return true;
          });
          this.log(`[FLOW] Registered: ${id}`);
        }
      } catch (err) { this.error(`Action ${act} failed:`, err.message); }
    });
  }
}

module.exports = RadiatorValveDriver;
