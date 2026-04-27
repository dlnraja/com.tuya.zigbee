'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.572: CRITICAL FIX - Flow card run listeners were missing
 */
class PlugEnergyMonitorDriver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
      }
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('PlugEnergyMonitorDriver v5.5.572 initialized');
    this._registerFlowCards();
  
  
  
  
  
  
  
  }

  _registerFlowCards() {
    // CONDITION: Plug is on/off
    try {
      const card = (() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })();
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
        this.log('[FLOW]  Registered: plug_energy_monitor_is_on');
      }
    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }

    // CONDITION: Power above threshold
    try {
      const card = (() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })();
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const power = args.device.getCapabilityValue('measure_power') || 0;
          return power > (args.power || 100);
      });
        this.log('[FLOW]  Registered: plug_energy_monitor_power_above');
      }
    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }

    // CONDITION: Energy above threshold
    try {
      const card = (() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })();
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const energy = args.device.getCapabilityValue('meter_power') || 0;
          return energy > (args.energy || 10);
      });
        this.log('[FLOW]  Registered: plug_energy_monitor_energy_above');
      }
    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }

    // ACTION: Turn on
    try {
      const card = (() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })();
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, true).catch(() => {});
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        });
        this.log('[FLOW]  Registered: plug_energy_monitor_turn_on');
      }
    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }

    // ACTION: Turn off
    try {
      const card = (() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })();
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, false).catch(() => {});
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        });
        this.log('[FLOW]  Registered: plug_energy_monitor_turn_off');
      }
    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }

    // ACTION: Toggle
    try {
      const card = (() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })();
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device._setGangOnOff(1, !current).catch(() => {});
          await args.device.setCapabilityValue('onoff', !current).catch(() => {});
          return true;
      });
        this.log('[FLOW]  Registered: plug_energy_monitor_toggle');
      }
    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }

    // ACTION: Reset energy meter
    try {
      const card = (() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })();
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('meter_power', 0).catch(() => {});
          return true;
        });
        this.log('[FLOW]  Registered: plug_energy_monitor_reset_meter');
      }
    } catch (err) { 
      this.log(`[FLOW-ERROR] ${err.message}`); 
    }

    this.log('[FLOW]  Energy monitor plug flow cards registered');
    }
module.exports = PlugEnergyMonitorDriver;
