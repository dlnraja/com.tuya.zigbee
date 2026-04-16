'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.575: CRITICAL FIX - Flow card run listeners were missing
 */
class RollerShutterControllerDriver extends ZigBeeDriver {
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

    this.log('RollerShutterControllerDriver v5.5.575 initialized');
    this._registerFlowCards();
  
  
  
  
  
  
  
  }

  _registerFlowCards() {
    // CONDITION: Is open
    try {
      (() => { try { return this.homey.flow.getConditionCard('shutter_roller_controller_is_open'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const pos = args.device.getCapabilityValue('windowcoverings_set') || 0;
          return pos > 0;
        });
      this.log('[FLOW] ✅ Registered: shutter_roller_controller_is_open');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Position above
    try {
      (() => { try { return this.homey.flow.getConditionCard('shutter_roller_controller_position_above'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const pos = args.device.getCapabilityValue('windowcoverings_set') || 0;
          return (pos * 100) > (args.position || 50);
        });
      this.log('[FLOW] ✅ Registered: shutter_roller_controller_position_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Is moving
    try {
      (() => { try { return this.homey.flow.getConditionCard('shutter_roller_controller_is_moving'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const state = args.device.getCapabilityValue('windowcoverings_state');
          return state === 'up' || state === 'down';
        });
      this.log('[FLOW] ✅ Registered: shutter_roller_controller_is_moving');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Open
    try {
      (() => { try { return this.homey.flow.getConditionCard('shutter_roller_controller_open'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('windowcoverings_set', 1);
          return true;
        });
      this.log('[FLOW] ✅ Registered: shutter_roller_controller_open');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Close
    try {
      (() => { try { return this.homey.flow.getConditionCard('shutter_roller_controller_close'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('windowcoverings_set', 0);
          return true;
        });
      this.log('[FLOW] ✅ Registered: shutter_roller_controller_close');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Stop
    try {
      (() => { try { return this.homey.flow.getConditionCard('shutter_roller_controller_stop'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('windowcoverings_state', 'idle');
          return true;
        });
      this.log('[FLOW] ✅ Registered: shutter_roller_controller_stop');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set position
    try {
      (() => { try { return this.homey.flow.getActionCard('shutter_roller_controller_set_position'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('windowcoverings_set', (args.position || 50) / 100);
          return true;
        });
      this.log('[FLOW] ✅ Registered: shutter_roller_controller_set_position');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW]  Roller shutter flow cards registered');
  }
}

module.exports = RollerShutterControllerDriver;
