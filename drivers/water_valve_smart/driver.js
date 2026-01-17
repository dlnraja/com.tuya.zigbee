'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.573: CRITICAL FIX - Flow card run listeners were missing
 */
class WaterValveSmartDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WaterValveSmartDriver v5.5.573 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Valve is open
    try {
      this.homey.flow.getConditionCard('water_valve_is_open')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW] ✅ water_valve_is_open');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Leak detected
    try {
      this.homey.flow.getConditionCard('water_valve_leak_detected')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_water') === true;
        });
      this.log('[FLOW] ✅ water_valve_leak_detected');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Temperature above
    try {
      this.homey.flow.getConditionCard('water_valve_temperature_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const temp = args.device.getCapabilityValue('measure_temperature') || 0;
          return temp > (args.temp || 5);
        });
      this.log('[FLOW] ✅ water_valve_temperature_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Open valve
    try {
      this.homey.flow.getActionCard('water_valve_open')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', true);
          return true;
        });
      this.log('[FLOW] ✅ water_valve_open');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Close valve
    try {
      this.homey.flow.getActionCard('water_valve_close')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', false);
          return true;
        });
      this.log('[FLOW] ✅ water_valve_close');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Toggle valve
    try {
      this.homey.flow.getActionCard('water_valve_toggle')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.setCapabilityValue('onoff', !current);
          return true;
        });
      this.log('[FLOW] ✅ water_valve_toggle');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] 🎉 Water valve flow cards registered');
  }
}

module.exports = WaterValveSmartDriver;
