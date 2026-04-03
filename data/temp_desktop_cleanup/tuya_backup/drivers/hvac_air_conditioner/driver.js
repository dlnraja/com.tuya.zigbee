'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.576: CRITICAL FIX - Flow card run listeners were missing
 */
class HvacAirConditionerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('HvacAirConditionerDriver v5.5.576 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Is on
    try {
      this.homey.flow.getConditionCard('hvac_air_conditioner_air_conditioner_hybrid_is_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW] ✅ hvac_air_conditioner_air_conditioner_hybrid_is_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn on
    try {
      this.homey.flow.getActionCard('hvac_air_conditioner_air_conditioner_hybrid_turn_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', true);
          return true;
        });
      this.log('[FLOW] ✅ hvac_air_conditioner_air_conditioner_hybrid_turn_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn off
    try {
      this.homey.flow.getActionCard('hvac_air_conditioner_air_conditioner_hybrid_turn_off')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', false);
          return true;
        });
      this.log('[FLOW] ✅ hvac_air_conditioner_air_conditioner_hybrid_turn_off');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Toggle
    try {
      this.homey.flow.getActionCard('hvac_air_conditioner_air_conditioner_hybrid_toggle')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.setCapabilityValue('onoff', !current);
          return true;
        });
      this.log('[FLOW] ✅ hvac_air_conditioner_air_conditioner_hybrid_toggle');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set target temperature
    try {
      this.homey.flow.getActionCard('hvac_air_conditioner_air_conditioner_hybrid_set_target_temperature')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('target_temperature', args.temperature);
          return true;
        });
      this.log('[FLOW] ✅ hvac_air_conditioner_air_conditioner_hybrid_set_target_temperature');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] 🎉 HVAC air conditioner flow cards registered');
  }
}

module.exports = HvacAirConditionerDriver;
