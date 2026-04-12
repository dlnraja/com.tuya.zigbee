'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.576: CRITICAL FIX - Flow card run listeners were missing
 */
class HvacAirConditionerDriver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
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

    this.log('HvacAirConditionerDriver v5.5.576 initialized');
    this._registerFlowCards();
  
  
  
  
  }

  _registerFlowCards() {
    // CONDITION: Is on
    try {

        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW] ✅ hvac_air_conditioner_air_conditioner_hybrid_is_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn on
    try {

        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, true).catch(() => {});
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ hvac_air_conditioner_air_conditioner_hybrid_turn_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn off
    try {

        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, false).catch(() => {});
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ hvac_air_conditioner_air_conditioner_hybrid_turn_off');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Toggle
    try {

        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device._setGangOnOff(1, !current).catch(() => {});
          await args.device.setCapabilityValue('onoff', !current).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ hvac_air_conditioner_air_conditioner_hybrid_toggle');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set target temperature
    try {

        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('target_temperature', args.temperature);
          return true;
        });
      this.log('[FLOW] ✅ hvac_air_conditioner_air_conditioner_hybrid_set_target_temperature');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW]  HVAC air conditioner flow cards registered');
  }
}

module.exports = HvacAirConditionerDriver;
