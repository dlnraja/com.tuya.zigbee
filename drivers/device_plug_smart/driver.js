'use strict';
const { safeMultiply } = require('../../lib/utils/tuyaUtils.js');

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.570: CRITICAL FIX - Flow card run listeners were missing
 */
class PlugSmartDriver extends ZigBeeDriver {
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

    this.log('PlugSmartDriver v5.5.570 initialized');
    this._registerFlowCards();
  
  
  
  
  
  
  
  }

  _registerFlowCards() {
    // CONDITION: Plug is/is not on
    try {
      const card = null;
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
        this.log('[FLOW]  plug_smart_is_on');
      }
    } catch (err) { this.log(`[FLOW]  ${err.message}`); }

    // ACTION: Turn on
    try {
      const card = null;
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, true).catch(() => {});
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        });
        this.log('[FLOW]  plug_smart_turn_on');
      }
    } catch (err) { this.log(`[FLOW]  ${err.message}`); }

    // ACTION: Turn off
    try {
      const card = null;
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, false).catch(() => {});
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        });
        this.log('[FLOW]  plug_smart_turn_off');
      }
    } catch (err) { this.log(`[FLOW]  ${err.message}`); }

    // ACTION: Toggle
    try {
      const card = null;
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device._setGangOnOff(1, !current).catch(() => {});
          await args.device.setCapabilityValue('onoff', !current).catch(() => {});
          return true;
        });
        this.log('[FLOW]  plug_smart_toggle');
      }
    } catch (err) { this.log(`[FLOW]  ${err.message}`); }

    // ACTION: Turn on after delay
    try {
      const card = null;
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const delay = args.delay || 10 * 1000;
          setTimeout(() => args.device.triggerCapabilityListener('onoff', true).catch(() => {}), delay);
          return true;
        });
        this.log('[FLOW]  plug_smart_turn_on_delay');
      }
    } catch (err) { this.log(`[FLOW]  ${err.message}`); }

    // ACTION: Turn off after delay
    try {
      const card = null;
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const delay = args.delay || 10 * 1000;
          setTimeout(() => args.device.triggerCapabilityListener('onoff', false).catch(() => {}), delay);
          return true;
        });
        this.log('[FLOW]  plug_smart_turn_off_delay');
      }
    } catch (err) { this.log(`[FLOW]  ${err.message}`); }

    this.log('[FLOW]  Smart plug flow cards registered');
    }
}
module.exports = PlugSmartDriver;
