'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class HybridHeaterThermostatDriver extends ZigBeeDriver {
  async onInit() {
    /* P131-AUTO-FLOW-LISTENERS */

    try {
      const __card = this.homey.flow.getConditionCard('hybrid_heater_thermostat_is_on');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (e) { this.error('[FLOW] hybrid_heater_thermostat_is_on:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('hybrid_heater_thermostat_turn_on');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('onoff', true).catch(() => {});
          } else {
            await args.device.setCapabilityValue('onoff', true).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] hybrid_heater_thermostat_turn_on:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('hybrid_heater_thermostat_turn_off');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('onoff', false).catch(() => {});
          } else {
            await args.device.setCapabilityValue('onoff', false).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] hybrid_heater_thermostat_turn_off:', e.message); }
    /* P131-AUTO-FLOW-LISTENERS-END */

    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('HybridHeaterThermostatDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    try {
      const card = this.homey.flow.getActionCard('hybrid_heater_thermostat_set_mode');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const mode = args.mode || args.value;
          await args.device.setCapabilityValue('thermostat_mode', mode).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action set_mode: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('hybrid_heater_thermostat_set_temperature');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const temp = args.temperature || args.value;
          await args.device.setCapabilityValue('target_temperature', temp).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action set_temperature: ${err.message}`); } }

    try {
      const card = this.homey.flow.getConditionCard('hybrid_heater_thermostat_mode_is');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('thermostat_mode') === args.mode;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition mode_is: ${err.message}`); } }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = HybridHeaterThermostatDriver;
