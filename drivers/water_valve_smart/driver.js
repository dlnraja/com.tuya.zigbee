'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.808: FIX - Flow card IDs must match app.json (not driver.flow.compose.json)
 * The homey compose build strips driver prefix from some flow card IDs
 */
class WaterValveSmartDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WaterValveSmartDriver v5.5.808 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // v5.5.808: Flow card IDs in app.json are "water_valve_*" not "water_valve_smart_*"
    
    // CONDITION: Valve is open
    try {
      this.homey.flow.getConditionCard('water_valve_is_open')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW] ✅ water_valve_is_open');
    } catch (err) { this.log(`[FLOW] ⚠️ Invalid Flow Card ID: water_valve_is_open - ${err.message}`); }

    // CONDITION: Leak detected (note: condition ID is water_valve_leak_detected, not leak_is_detected)
    try {
      this.homey.flow.getConditionCard('water_valve_leak_detected')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_water') === true;
        });
      this.log('[FLOW] ✅ water_valve_leak_detected');
    } catch (err) { this.log(`[FLOW] ⚠️ Invalid Flow Card ID: water_valve_leak_detected - ${err.message}`); }

    // CONDITION: Temperature above
    try {
      this.homey.flow.getConditionCard('water_valve_temperature_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const temp = args.device.getCapabilityValue('measure_temperature') || 0;
          return temp > (args.temp || 5);
        });
      this.log('[FLOW] ✅ water_valve_temperature_above');
    } catch (err) { this.log(`[FLOW] ⚠️ Invalid Flow Card ID: water_valve_temperature_above - ${err.message}`); }

    // ACTION: Open valve
    try {
      this.homey.flow.getActionCard('water_valve_open')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', true);
          return true;
        });
      this.log('[FLOW] ✅ water_valve_open');
    } catch (err) { this.log(`[FLOW] ⚠️ Invalid Flow Card ID: water_valve_open - ${err.message}`); }

    // ACTION: Close valve
    try {
      this.homey.flow.getActionCard('water_valve_close')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', false);
          return true;
        });
      this.log('[FLOW] ✅ water_valve_close');
    } catch (err) { this.log(`[FLOW] ⚠️ Invalid Flow Card ID: water_valve_close - ${err.message}`); }

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
    } catch (err) { this.log(`[FLOW] ⚠️ Invalid Flow Card ID: water_valve_toggle - ${err.message}`); }

    this.log('[FLOW] 🎉 Water valve flow cards registered');
  }
}

module.exports = WaterValveSmartDriver;
