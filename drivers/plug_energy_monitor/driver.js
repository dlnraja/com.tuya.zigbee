'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.572: CRITICAL FIX - Flow card run listeners were missing
 */
class PlugEnergyMonitorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('PlugEnergyMonitorDriver v5.5.572 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Plug is on/off
    try {
      this.homey.flow.getConditionCard('plug_energy_monitor_is_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW] ✅ plug_energy_monitor_is_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Power above threshold
    try {
      this.homey.flow.getConditionCard('plug_energy_monitor_power_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const power = args.device.getCapabilityValue('measure_power') || 0;
          return power > (args.power || 100);
        });
      this.log('[FLOW] ✅ plug_energy_monitor_power_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Energy above threshold
    try {
      this.homey.flow.getConditionCard('plug_energy_monitor_energy_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const energy = args.device.getCapabilityValue('meter_power') || 0;
          return energy > (args.energy || 10);
        });
      this.log('[FLOW] ✅ plug_energy_monitor_energy_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn on
    try {
      this.homey.flow.getActionCard('plug_energy_monitor_turn_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', true);
          return true;
        });
      this.log('[FLOW] ✅ plug_energy_monitor_turn_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn off
    try {
      this.homey.flow.getActionCard('plug_energy_monitor_turn_off')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', false);
          return true;
        });
      this.log('[FLOW] ✅ plug_energy_monitor_turn_off');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Toggle
    try {
      this.homey.flow.getActionCard('plug_energy_monitor_toggle')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.setCapabilityValue('onoff', !current);
          return true;
        });
      this.log('[FLOW] ✅ plug_energy_monitor_toggle');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Reset energy meter
    try {
      this.homey.flow.getActionCard('plug_energy_monitor_reset_meter')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('meter_power', 0);
          return true;
        });
      this.log('[FLOW] ✅ plug_energy_monitor_reset_meter');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] 🎉 Energy monitor plug flow cards registered');
  }
}

module.exports = PlugEnergyMonitorDriver;
