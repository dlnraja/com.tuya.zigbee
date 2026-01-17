'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.573: CRITICAL FIX - Flow card run listeners were missing
 */
class ThermostatTuyaDpDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ThermostatTuyaDpDriver v5.5.573 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Is heating
    try {
      this.homey.flow.getConditionCard('thermostat_tuya_dp_is_heating')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('tuya_thermostat_heating') === true;
        });
      this.log('[FLOW] ✅ thermostat_tuya_dp_is_heating');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Temperature above target
    try {
      this.homey.flow.getConditionCard('thermostat_tuya_dp_temperature_above_target')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('measure_temperature') || 0;
          const target = args.device.getCapabilityValue('target_temperature') || 20;
          return current > target;
        });
      this.log('[FLOW] ✅ thermostat_tuya_dp_temperature_above_target');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Temperature below target
    try {
      this.homey.flow.getConditionCard('thermostat_tuya_dp_temperature_below_target')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('measure_temperature') || 0;
          const target = args.device.getCapabilityValue('target_temperature') || 20;
          return current < target;
        });
      this.log('[FLOW] ✅ thermostat_tuya_dp_temperature_below_target');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Mode is
    try {
      this.homey.flow.getConditionCard('thermostat_tuya_dp_mode_is')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const mode = args.device.getCapabilityValue('tuya_thermostat_mode');
          return mode === args.mode;
        });
      this.log('[FLOW] ✅ thermostat_tuya_dp_mode_is');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set target temperature
    try {
      this.homey.flow.getActionCard('thermostat_tuya_dp_set_target_temperature')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('target_temperature', args.temperature);
          return true;
        });
      this.log('[FLOW] ✅ thermostat_tuya_dp_set_target_temperature');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set mode
    try {
      this.homey.flow.getActionCard('thermostat_tuya_dp_set_mode')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('tuya_thermostat_mode', args.mode);
          return true;
        });
      this.log('[FLOW] ✅ thermostat_tuya_dp_set_mode');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Increase temperature
    try {
      this.homey.flow.getActionCard('thermostat_tuya_dp_increase_temperature')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('target_temperature') || 20;
          await args.device.setCapabilityValue('target_temperature', current + (args.degrees || 1));
          return true;
        });
      this.log('[FLOW] ✅ thermostat_tuya_dp_increase_temperature');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Decrease temperature
    try {
      this.homey.flow.getActionCard('thermostat_tuya_dp_decrease_temperature')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('target_temperature') || 20;
          await args.device.setCapabilityValue('target_temperature', current - (args.degrees || 1));
          return true;
        });
      this.log('[FLOW] ✅ thermostat_tuya_dp_decrease_temperature');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] 🎉 Thermostat flow cards registered');
  }
}

module.exports = ThermostatTuyaDpDriver;
