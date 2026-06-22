'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class HybridSensorThermostatDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('HybridSensorThermostatDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('hybrid_sensor_thermostat_set_mode');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const mode = args.mode || args.value;
          await args.device.setCapabilityValue('thermostat_mode', mode).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action set_mode: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('hybrid_sensor_thermostat_set_temperature');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const temp = args.temperature || args.value;
          await args.device.setCapabilityValue('target_temperature', temp).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action set_temperature: ${err.message}`); }; }

    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('hybrid_sensor_thermostat_mode_is');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('thermostat_mode') === args.mode;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition mode_is: ${err.message}`); }; }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = HybridSensorThermostatDriver;
