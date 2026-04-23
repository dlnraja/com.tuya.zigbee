'use strict';

// A8: NaN Safety - use safeDivide/safeMultiply
  require('homey');

/**
 * v5.8.20: FIX MODULE_NOT_FOUND ./rgb - Use Homey.Driver instead of ZigBeeDriver
 * v5.5.808: FIX - Flow card IDs must match app.json (not driver.flow.compose.json)
 */
class WaterValveSmartDriver extends Homey.Driver {

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('WaterValveSmartDriver v5.9.16 initialized');
    this._registerFlowCards();
  
  
  
  
  
  
  
  }

  _registerFlowCards() {
    // v5.5.808: Flow card IDs in app.json are "water_valve_*" not "water_valve_smart_*"
    
    // CONDITION: Valve is open
    try {
      const card = const card = this.homey.flow.getConditionCard('water_valve_smart_is_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
        this.log('[FLOW]  Registered: water_valve_smart_is_open');
      }
    } catch (err) { this.log(`[FLOW]  water_valve_smart_is_open: ${err.message}`); }

    // CONDITION: Leak is detected
    try {
      const card = const card = this.homey.flow.getConditionCard('water_valve_smart_leak_is_detected');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_water') === true;
        });
        this.log('[FLOW]  Registered: water_valve_smart_leak_is_detected');
      }
    } catch (err) { this.log(`[FLOW]  water_valve_smart_leak_is_detected: ${err.message}`); }

    // CONDITION: Temperature above
    try {
      const card = const card = this.homey.flow.getConditionCard('water_valve_smart_temperature_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const temp = args.device.getCapabilityValue('measure_temperature') || 0;
          return temp > (args.temp || 5);
      });
        this.log('[FLOW]  Registered: water_valve_smart_temperature_above');
      }
    } catch (err) { this.log(`[FLOW]  water_valve_smart_temperature_above: ${err.message}`); }

    // ACTION: Open valve
    try {
      const card = const card = this.homey.flow.getActionCard('water_valve_smart_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device._setGangOnOff === 'function') {
            await args.device._setGangOnOff(1, true).catch(() => {});
          }
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        });
        this.log('[FLOW]  Registered: water_valve_smart_open');
      }
    } catch (err) { this.log(`[FLOW]  water_valve_smart_open: ${err.message}`); }

    // ACTION: Close valve
    try {
      const card = const card = this.homey.flow.getActionCard('water_valve_smart_close');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device._setGangOnOff === 'function') {
            await args.device._setGangOnOff(1, false).catch(() => {});
          }
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        });
        this.log('[FLOW]  Registered: water_valve_smart_close');
      }
    } catch (err) { this.log(`[FLOW]  water_valve_smart_close: ${err.message}`); }

    // ACTION: Toggle valve
    try {
      const card = const card = this.homey.flow.getActionCard('water_valve_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          if (typeof args.device._setGangOnOff === 'function') {
            await args.device._setGangOnOff(1, !current).catch(() => {});
          }
          await args.device.setCapabilityValue('onoff', !current).catch(() => {});
          return true;
        });
        this.log('[FLOW]  Registered: water_valve_toggle');
      }
    } catch (err) { this.log(`[FLOW]  water_valve_toggle: ${err.message}`); }

    // CONDITION: Water is/is not detected
    try {
      const card = const card = this.homey.flow.getConditionCard('water_valve_smart_water_detected');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_water') === true;
        });
        this.log('[FLOW]  Registered: water_valve_smart_water_detected');
      }
    } catch (err) { this.log(`[FLOW]  water_valve_smart_water_detected: ${err.message}`); }

    this.log('[FLOW] \uD83C\uDF89 Water valve flow cards registered');
  }
}

module.exports = WaterValveSmartDriver;
