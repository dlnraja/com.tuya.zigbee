'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.577: CRITICAL FIX - Flow card run listeners were missing
 */
class SmartBulbWhiteDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartBulbWhiteDriver v5.5.577 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Is on
    try {
      this.homey.flow.getDeviceConditionCard('bulb_white_smart_bulb_white_is_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW] ✅ bulb_white_smart_bulb_white_is_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn on
    try {
      this.homey.flow.getDeviceActionCard('bulb_white_smart_bulb_white_turn_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, true).catch(() => {});
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ bulb_white_smart_bulb_white_turn_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn off
    try {
      this.homey.flow.getDeviceActionCard('bulb_white_smart_bulb_white_turn_off')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, false).catch(() => {});
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ bulb_white_smart_bulb_white_turn_off');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Toggle
    try {
      this.homey.flow.getDeviceActionCard('bulb_white_smart_bulb_white_toggle')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device._setGangOnOff(1, !current).catch(() => {});
          await args.device.setCapabilityValue('onoff', !current).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ bulb_white_smart_bulb_white_toggle');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set brightness
    try {
      this.homey.flow.getDeviceActionCard('bulb_white_smart_bulb_white_set_dim')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness);
          return true;
        });
      this.log('[FLOW] ✅ bulb_white_smart_bulb_white_set_dim');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW]  White bulb flow cards registered');
  }
}

module.exports = SmartBulbWhiteDriver;
