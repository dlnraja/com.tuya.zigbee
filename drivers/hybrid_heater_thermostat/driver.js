'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerOnoffFlowCards, setActuatorCapability } = require('../../lib/flow/ActuatorFlowHelper');

/**
 * P130: Prefer triggerCapabilityListener path for onoff / mode / temperature.
 */
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
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;

    registerOnoffFlowCards(this, 'hybrid_heater_thermostat');

    try {
      const card = this.homey.flow.getActionCard('hybrid_heater_thermostat_set_mode');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) { return false; }
          return setActuatorCapability(args.device, 'thermostat_mode', args.mode || args.value);
        });
      }
    } catch (err) {
      this.log(`[FLOW] set_mode: ${err.message}`);
    }

    try {
      const card = this.homey.flow.getActionCard('hybrid_heater_thermostat_set_temperature');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) { return false; }
          return setActuatorCapability(args.device, 'target_temperature', Number(args.temperature || args.value));
        });
      }
    } catch (err) {
      this.log(`[FLOW] set_temperature: ${err.message}`);
    }

    this.log('HybridHeaterThermostatDriver flow cards registered (P130)');
  }
}

module.exports = HybridHeaterThermostatDriver;
