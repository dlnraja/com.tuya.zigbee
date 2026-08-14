'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class RadiatorValveDriver extends ZigBeeDriver {
async onInit() {
    /* P131-AUTO-FLOW-LISTENERS */

    try {
      const __card = this.homey.flow.getActionCard('device_radiator_valve_smart_set_target_temperature');
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
    } catch (e) { this.error('[FLOW] device_radiator_valve_smart_set_target_temperature:', e.message); }
    /* P131-AUTO-FLOW-LISTENERS-END */

    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('RadiatorValveDriver v5.5.572 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS

    // ACTIONS
    try {
      // A8: NaN Safety - use safeDivide/safeMultiply
  const card = null;
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('target_temperature', args.temperature || args.value).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_radiator_valve_smart_hybrid_set_target_temperature: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('device_radiator_valve_smart_set_temperature');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('target_temperature', args.temperature || args.value).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_radiator_valve_smart_set_temperature: ${err.message}`); } }

    this.log('[FLOW] All flow cards registered');
    }
}
module.exports = RadiatorValveDriver;
