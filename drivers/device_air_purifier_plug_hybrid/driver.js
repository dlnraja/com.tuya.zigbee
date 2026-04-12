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
  }


  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('PlugEnergyMonitorDriver v5.5.572 initialized');
    this._registerFlowCards();
  
  
  
  
  }

  _registerFlowCards() {
    const safeRegister = (type, id, handler) => {
      try {
        const card = type === 'condition' ?

        if (card) {
          card.registerRunListener(handler);
          this.log(`[FLOW] ✅ ${id}`);
        }
      } catch (e) { this.log(`[FLOW] ⚠️ Failed to register ${id}: ${e.message}`); }
    };

    // CONDITION: Plug is on/off
    safeRegister('condition', 'plug_energy_monitor_is_on', async (args) => {
      if (!args.device) return false;
      return args.device.getCapabilityValue('onoff') === true;
    });

    // CONDITION: Power above threshold
    safeRegister('condition', 'plug_energy_monitor_power_above', async (args) => {
      if (!args.device) return false;
      const power = args.device.getCapabilityValue('measure_power') || 0;
      return power > (args.power || 100);
    });

    // CONDITION: Energy above threshold
    safeRegister('condition', 'plug_energy_monitor_energy_above', async (args) => {
      if (!args.device) return false;
      const energy = args.device.getCapabilityValue('meter_power') || 0;
      return energy > (args.energy || 10);
    });

    // ACTION: Turn on
    safeRegister('action', 'plug_energy_monitor_turn_on', async (args) => {
      if (!args.device) return false;
      if (typeof args.device._setGangOnOff === 'function') {
        await args.device._setGangOnOff(1, true);
      }
      await args.device.setCapabilityValue('onoff', true).catch(() => {});
      return true;
    });

    // ACTION: Turn off
    safeRegister('action', 'plug_energy_monitor_turn_off', async (args) => {
      if (!args.device) return false;
      if (typeof args.device._setGangOnOff === 'function') {
        await args.device._setGangOnOff(1, false);
      }
      await args.device.setCapabilityValue('onoff', false).catch(() => {});
      return true;
    });

    // ACTION: Toggle
    safeRegister('action', 'plug_energy_monitor_toggle', async (args) => {
      if (!args.device) return false;
      const current = args.device.getCapabilityValue('onoff');
      if (typeof args.device._setGangOnOff === 'function') {
        await args.device._setGangOnOff(1, !current).catch(() => {});
      }
      await args.device.setCapabilityValue('onoff', !current).catch(() => {});
      return true;
    });

    // ACTION: Reset energy meter
    safeRegister('action', 'plug_energy_monitor_reset_meter', async (args) => {
      if (!args.device) return false;
      if (typeof args.device.triggerCapabilityListener === 'function') {
        await args.device.triggerCapabilityListener('meter_power', 0);
      }
      return true;
    });

    this.log('[FLOW]  Energy monitor plug flow cards registered');
  }
}

module.exports = PlugEnergyMonitorDriver;
