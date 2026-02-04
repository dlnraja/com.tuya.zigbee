'use strict';

const Homey = require('homey');

/**
 * v5.8.20: FIX MODULE_NOT_FOUND ./rgb - Use Homey.Driver instead of ZigBeeDriver
 * v5.5.808: FIX - Flow card IDs must match app.json (not driver.flow.compose.json)
 */
class WaterValveSmartDriver extends Homey.Driver {

  async onInit() {
    this.log('WaterValveSmartDriver v5.5.808 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // v5.5.808: Flow card IDs in app.json are "water_valve_*" not "water_valve_smart_*"
    
    // CONDITION: Valve is open
    try {
      this.homey.flow.getConditionCard('water_valve_smart_is_open')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW] ✅ water_valve_smart_is_open');
    } catch (err) { this.log(`[FLOW] ⚠️ water_valve_smart_is_open: ${err.message}`); }

    // CONDITION: Leak is detected (v5.8.10: Fixed ID to match driver.flow.compose.json)
    try {
      this.homey.flow.getConditionCard('water_valve_smart_leak_is_detected')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_water') === true;
        });
      this.log('[FLOW] ✅ water_valve_smart_leak_is_detected');
    } catch (err) { this.log(`[FLOW] ⚠️ water_valve_smart_leak_is_detected: ${err.message}`); }

    // CONDITION: Temperature above
    try {
      this.homey.flow.getConditionCard('water_valve_smart_temperature_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const temp = args.device.getCapabilityValue('measure_temperature') || 0;
          return temp > (args.temp || 5);
        });
      this.log('[FLOW] ✅ water_valve_smart_temperature_above');
    } catch (err) { this.log(`[FLOW] ⚠️ water_valve_smart_temperature_above: ${err.message}`); }

    // ACTION: Open valve
    try {
      this.homey.flow.getActionCard('water_valve_smart_open')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', true);
          return true;
        });
      this.log('[FLOW] ✅ water_valve_smart_open');
    } catch (err) { this.log(`[FLOW] ⚠️ water_valve_smart_open: ${err.message}`); }

    // ACTION: Close valve
    try {
      this.homey.flow.getActionCard('water_valve_smart_close')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', false);
          return true;
        });
      this.log('[FLOW] ✅ water_valve_smart_close');
    } catch (err) { this.log(`[FLOW] ⚠️ water_valve_smart_close: ${err.message}`); }

    // ACTION: Toggle valve
    try {
      this.homey.flow.getActionCard('water_valve_smart_toggle')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.setCapabilityValue('onoff', !current);
          return true;
        });
      this.log('[FLOW] ✅ water_valve_smart_toggle');
    } catch (err) { this.log(`[FLOW] ⚠️ water_valve_smart_toggle: ${err.message}`); }

    this.log('[FLOW] 🎉 Water valve flow cards registered');
  }
}

module.exports = WaterValveSmartDriver;

