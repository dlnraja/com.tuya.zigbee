'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.575: CRITICAL FIX - Flow card run listeners were missing
 */
class DoorControllerDriver extends ZigBeeDriver {
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

    this.log('DoorControllerDriver v5.5.575 initialized');
    this._registerFlowCards();
  
  
  
  
  }

  _registerFlowCards() {
    // CONDITION: Door is open
    try {
      this.homey.flow.getConditionCard('door_controller_is_open')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_contact') === true;
        });
      this.log('[FLOW] ✅ Registered: door_controller_is_open');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Door is locked
    try {
      this.homey.flow.getConditionCard('door_controller_is_locked')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('locked') === true;
        });
      this.log('[FLOW] ✅ Registered: door_controller_is_locked');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Open door
    try {
      this.homey.flow.getConditionCard('door_controller_open')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, true).catch(() => {});
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ Registered: door_controller_open');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Close door
    try {
      this.homey.flow.getConditionCard('door_controller_close')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, false).catch(() => {});
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ Registered: door_controller_close');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Lock door
    try {
      this.homey.flow.getConditionCard('door_controller_lock')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('locked', true);
          return true;
        });
      this.log('[FLOW] ✅ Registered: door_controller_lock');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Unlock door
    try {
      this.homey.flow.getConditionCard('door_controller_unlock')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('locked', false);
          return true;
        });
      this.log('[FLOW] ✅ Registered: door_controller_unlock');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW]  Door controller flow cards registered');
  }
}

module.exports = DoorControllerDriver;
