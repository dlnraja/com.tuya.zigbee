'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.572: CRITICAL FIX - Flow card run listeners were missing
 */
class RadiatorValveDriver extends ZigBeeDriver {

  async onInit() {
    this.log('RadiatorValveDriver v5.5.572 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // ACTION: Set target temperature
    try {
      this.homey.flow.getActionCard('radiator_valve_set_target_temperature')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('target_temperature', args.temperature);
          return true;
        });
      this.log('[FLOW] ✅ radiator_valve_set_target_temperature');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] 🎉 Radiator valve flow cards registered');
  }
}

module.exports = RadiatorValveDriver;
