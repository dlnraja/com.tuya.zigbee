'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerOnoffFlowCards, setActuatorCapability } = require('../../lib/flow/ActuatorFlowHelper');

/**
 * P130: Prefer triggerCapabilityListener path for onoff / mode / temperature.
 */
class HybridHeaterThermostatDriver extends ZigBeeDriver {
  async onInit() {
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
