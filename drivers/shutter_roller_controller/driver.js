'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.575: CRITICAL FIX - Flow card run listeners were missing
 */
class RollerShutterControllerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('RollerShutterControllerDriver v5.5.575 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Is open
    try {
      this.homey.flow.getDeviceConditionCard('shutter_roller_controller_is_open')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const pos = args.device.getCapabilityValue('windowcoverings_set') || 0;
          return pos > 0;
        });
      this.log('[FLOW] ✅ shutter_roller_controller_is_open');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Position above
    try {
      this.homey.flow.getDeviceConditionCard('shutter_roller_controller_position_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const pos = args.device.getCapabilityValue('windowcoverings_set') || 0;
          return (pos * 100) > (args.position || 50);
        });
      this.log('[FLOW] ✅ shutter_roller_controller_position_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Is moving
    try {
      this.homey.flow.getDeviceConditionCard('shutter_roller_controller_is_moving')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const state = args.device.getCapabilityValue('windowcoverings_state');
          return state === 'up' || state === 'down';
        });
      this.log('[FLOW] ✅ shutter_roller_controller_is_moving');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Open
    try {
      this.homey.flow.getDeviceActionCard('shutter_roller_controller_open')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('windowcoverings_set', 1);
          return true;
        });
      this.log('[FLOW] ✅ shutter_roller_controller_open');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Close
    try {
      this.homey.flow.getDeviceActionCard('shutter_roller_controller_close')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('windowcoverings_set', 0);
          return true;
        });
      this.log('[FLOW] ✅ shutter_roller_controller_close');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Stop
    try {
      this.homey.flow.getDeviceActionCard('shutter_roller_controller_stop')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('windowcoverings_state', 'idle');
          return true;
        });
      this.log('[FLOW] ✅ shutter_roller_controller_stop');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set position
    try {
      this.homey.flow.getDeviceActionCard('shutter_roller_controller_set_position')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('windowcoverings_set', (args.position || 50) / 100);
          return true;
        });
      this.log('[FLOW] ✅ shutter_roller_controller_set_position');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW]  Roller shutter flow cards registered');
  }
}

module.exports = RollerShutterControllerDriver;
