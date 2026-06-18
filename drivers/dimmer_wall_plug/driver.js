'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class PlugEnergyMonitorDriver extends ZigBeeDriver {
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('PlugEnergyMonitorDriver v5.5.572 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    const _triggerIds = ["dimmer_wall_plug_plug_energy_monitor_turned_on","dimmer_wall_plug_plug_energy_monitor_turned_off","dimmer_wall_plug_plug_energy_monitor_measure_power_changed","dimmer_wall_plug_plug_energy_monitor_measure_voltage_changed","dimmer_wall_plug_plug_energy_monitor_measure_current_changed","dimmer_wall_plug_plug_energy_monitor_meter_power_changed","dimmer_wall_plug_plug_energy_monitor_power_changed","dimmer_wall_plug_plug_energy_monitor_battery_low"];
    for (const _tid of _triggerIds) {
      try {
        const _card = this._getFlowCard(_tid, "trigger");
        if (_card) {
          _card.registerRunListener(async (args) => {
            if (!args.device) return;
            args.device.emit("flow:" + _tid, args);
          });
        }
      } catch (_err) { this.error("Trigger " + _tid + ": " + _err.message); }
    }
    // END TRIGGERS
    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('dimmer_wall_plug_plug_energy_monitor_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition dimmer_wall_plug_plug_energy_monitor_is_on: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('dimmer_wall_plug_plug_energy_monitor_power_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { this.error(`Condition dimmer_wall_plug_plug_energy_monitor_power_above: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('dimmer_wall_plug_plug_energy_monitor_energy_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { this.error(`Condition dimmer_wall_plug_plug_energy_monitor_energy_above: ${err.message}`); }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('dimmer_wall_plug_plug_energy_monitor_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action dimmer_wall_plug_plug_energy_monitor_turn_on: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('dimmer_wall_plug_plug_energy_monitor_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action dimmer_wall_plug_plug_energy_monitor_turn_off: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('dimmer_wall_plug_plug_energy_monitor_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action dimmer_wall_plug_plug_energy_monitor_toggle: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('dimmer_wall_plug_plug_energy_monitor_reset_meter');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action dimmer_wall_plug_plug_energy_monitor_reset_meter triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action dimmer_wall_plug_plug_energy_monitor_reset_meter: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = PlugEnergyMonitorDriver;

