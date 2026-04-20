'use strict';

const { safeMultiply } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDriver } = require('homey-zigbeedriver');

class PlugSmartDriver extends ZigBeeDriver {
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
    this.log('PlugSmartDriver v5.5.570 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('device_plug_energy_monitor_hybrid_plug_smart_turned_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('device_plug_energy_monitor_hybrid_plug_smart_turned_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('device_plug_energy_monitor_hybrid_plug_smart_power_restored'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('device_plug_energy_monitor_hybrid_plug_smart_power_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('device_plug_energy_monitor_hybrid_plug_smart_power_threshold'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('device_plug_energy_monitor_hybrid_plug_smart_battery_low'); } catch (e) {}

    // CONDITIONS
    try {
      const card = this._getFlowCard('device_plug_energy_monitor_hybrid_plug_smart_is_on', 'condition');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition device_plug_energy_monitor_hybrid_plug_smart_is_on: ${err.message}`); }

    // ACTIONS
    try {
      const card = this._getFlowCard('device_plug_energy_monitor_hybrid_plug_smart_turn_on', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action device_plug_energy_monitor_hybrid_plug_smart_turn_on: ${err.message}`); }

    try {
      const card = this._getFlowCard('device_plug_energy_monitor_hybrid_plug_smart_turn_off', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action device_plug_energy_monitor_hybrid_plug_smart_turn_off: ${err.message}`); }

    try {
      const card = this._getFlowCard('device_plug_energy_monitor_hybrid_plug_smart_toggle', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action device_plug_energy_monitor_hybrid_plug_smart_toggle: ${err.message}`); }

    try {
      const card = this._getFlowCard('device_plug_energy_monitor_hybrid_plug_smart_turn_on_delay', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action device_plug_energy_monitor_hybrid_plug_smart_turn_on_delay: ${err.message}`); }

    try {
      const card = this._getFlowCard('device_plug_energy_monitor_hybrid_plug_smart_turn_off_delay', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action device_plug_energy_monitor_hybrid_plug_smart_turn_off_delay: ${err.message}`); }

    try {
      const card = this._getFlowCard('device_plug_energy_monitor_hybrid_plug_smart_set_indicator', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action device_plug_energy_monitor_hybrid_plug_smart_set_indicator triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action device_plug_energy_monitor_hybrid_plug_smart_set_indicator: ${err.message}`); }

    try {
      const card = this._getFlowCard('device_plug_energy_monitor_hybrid_plug_smart_set_power_on', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action device_plug_energy_monitor_hybrid_plug_smart_set_power_on: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = PlugSmartDriver;
