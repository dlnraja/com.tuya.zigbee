'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.573: CRITICAL FIX - Flow card run listeners were missing
 */
class ThermostatTuyaDpDriver extends ZigBeeDriver {
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

    this.log('ThermostatTuyaDpDriver v5.5.573 initialized');
    this._registerFlowCards();
  
  
  
  
  
  
  
  }

  _registerFlowCards() {
    // CONDITION: Is heating
    try {
      const card = this._getFlowCard('thermostat_tuya_dp_is_heating', 'condition');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('tuya_thermostat_heating') === true;
        });
        this.log('[FLOW]  Registered: thermostat_tuya_dp_is_heating');
      }
    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }

    // CONDITION: Temperature above target
    try {
      const card = this._getFlowCard('thermostat_tuya_dp_temperature_above_target', 'condition');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('measure_temperature') || 0;
          const target = args.device.getCapabilityValue('target_temperature') || 20;
          return current > target;
        });
        this.log('[FLOW]  Registered: thermostat_tuya_dp_temperature_above_target');
      }
    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }

    // CONDITION: Temperature below target
    try {
      const card = this._getFlowCard('thermostat_tuya_dp_temperature_below_target', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('measure_temperature') || 0;
          const target = args.device.getCapabilityValue('target_temperature') || 20;
          return current < target;
        });
        this.log('[FLOW]  Registered: thermostat_tuya_dp_temperature_below_target');
      }
    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }

    // CONDITION: Mode is
    try {
      const card = this._getFlowCard('thermostat_tuya_dp_mode_is', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const mode = args.device.getCapabilityValue('tuya_thermostat_mode');
          return mode === args.mode;
        });
        this.log('[FLOW]  Registered: thermostat_tuya_dp_mode_is');
      }
    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }

    // ACTION: Set target temperature
    try {
      const card = this._getFlowCard('thermostat_tuya_dp_set_target_temperature', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('target_temperature', args.temperature);
          return true;
        });
        this.log('[FLOW]  Registered: thermostat_tuya_dp_set_target_temperature');
      }
    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }

    // ACTION: Set mode
    try {
      const card = this._getFlowCard('thermostat_tuya_dp_set_mode', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('tuya_thermostat_mode', args.mode);
          return true;
        });
        this.log('[FLOW]  Registered: thermostat_tuya_dp_set_mode');
      }
    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }

    // ACTION: Increase temperature
    try {
      const card = this._getFlowCard('thermostat_tuya_dp_increase_temperature', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('target_temperature') || 20;
          await args.device.triggerCapabilityListener('target_temperature', current + (args.degrees || 1));
          return true;
        });
        this.log('[FLOW]  Registered: thermostat_tuya_dp_increase_temperature');
      }
    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }

    // ACTION: Decrease temperature
    try {
      const card = this._getFlowCard('thermostat_tuya_dp_decrease_temperature', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('target_temperature') || 20;
          await args.device.triggerCapabilityListener('target_temperature', current - (args.degrees || 1));
          return true;
        });
        this.log('[FLOW]  Registered: thermostat_tuya_dp_decrease_temperature');
      }

    this.log('[FLOW]  Thermostat flow cards registered');
  }
}
    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }

module.exports = ThermostatTuyaDpDriver;
