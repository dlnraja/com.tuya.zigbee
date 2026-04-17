'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AirPurifierDriver extends ZigBeeDriver {
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

    this.log('Air Purifier Driver initialized');
    
    const safeRegister = (type, id, handler) => {
      try {
        const card = type === 'trigger' ?

        if (card && handler) card.registerRunListener(handler);
      
  
  
  
  
  
  
  } catch (e) { this.error(`[FLOW] Failed to register ${id}: ${e.message}`); }
    };

    // Pre-cache triggers
    const triggers = ['air_purifier_turned_on', 'air_purifier_turned_off', 'air_purifier_pm25_changed'];
    for (const id of triggers) {
      safeRegister('trigger', id);
    }

    safeRegister('action', 'air_purifier_set_fan_speed', async (args) => {
      if (!args.device) return false;
      await args.device.triggerCapabilityListener?.('dim', safeParse(args.speed, 100));
      return true;
    });

    safeRegister('action', 'air_purifier_turn_on', async (args) => {
      if (!args.device) return false;
      if (typeof args.device._setGangOnOff === 'function') {
        await args.device._setGangOnOff(1, true).catch(() => {});
      }
      await args.device.setCapabilityValue('onoff', true).catch(() => {});
      return true;
    });

    safeRegister('action', 'air_purifier_turn_off', async (args) => {
      if (!args.device) return false;
      if (typeof args.device._setGangOnOff === 'function') {
        await args.device._setGangOnOff(1, false).catch(() => {});
      }
      await args.device.setCapabilityValue('onoff', false).catch(() => {});
      return true;
    });

    safeRegister('action', 'air_purifier_toggle', async (args) => {
      if (!args.device) return false;
      const cur = args.device.getCapabilityValue('onoff');
      if (typeof args.device.triggerCapabilityListener === 'function') {
        await args.device.triggerCapabilityListener('onoff', !cur).catch(() => {});
      }
      return true;
    });

    safeRegister('action', 'air_purifier_set_brightness', async (args) => {
      if (!args.device) return false;
      await args.device.triggerCapabilityListener?.('dim', safeParse(args.brightness, 100));
      return true;
    });
  }
}

module.exports = AirPurifierDriver;

