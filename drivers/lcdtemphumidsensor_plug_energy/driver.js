'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class PlugEnergyMonitorDriver extends ZigBeeDriver {
async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('PlugEnergyMonitorDriver v5.5.572 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS

    // CONDITIONS
    try {
      // A8: NaN Safety - use safeDivide/safeMultiply
  const card = null;
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition lcdtemphumidsensor_plug_energy_hybrid_plug_energy_monitor_is_on: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('lcdtemphumidsensor_plug_energy_power_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition lcdtemphumidsensor_plug_energy_power_above: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('lcdtemphumidsensor_plug_energy_energy_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition lcdtemphumidsensor_plug_energy_energy_above: ${err.message}`); }; }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('lcdtemphumidsensor_plug_energy_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action lcdtemphumidsensor_plug_energy_turn_on: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('lcdtemphumidsensor_plug_energy_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action lcdtemphumidsensor_plug_energy_turn_off: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('lcdtemphumidsensor_plug_energy_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action lcdtemphumidsensor_plug_energy_toggle: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('lcdtemphumidsensor_plug_energy_reset_meter');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          // Generic action handler
          this.log('[FLOW] Action lcdtemphumidsensor_plug_energy_reset_meter triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action lcdtemphumidsensor_plug_energy_reset_meter: ${err.message}`); }; }

    this.log('[FLOW] All flow cards registered');
    }
}
module.exports = PlugEnergyMonitorDriver;
