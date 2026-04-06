'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.575: CRITICAL FIX - Flow card run listeners were missing
 */
class CeilingFanDriver extends ZigBeeDriver {

  async onInit() {
    this.log('CeilingFanDriver v5.5.575 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Is on
    try {
      this.homey.flow.getConditionCard('ceiling_fan_is_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW] ✅ ceiling_fan_is_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn on
    try {
      this.homey.flow.getActionCard('ceiling_fan_turn_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, true).catch(() => {});
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ ceiling_fan_turn_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn off
    try {
      this.homey.flow.getActionCard('ceiling_fan_turn_off')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, false).catch(() => {});
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ ceiling_fan_turn_off');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Toggle
    try {
      this.homey.flow.getActionCard('ceiling_fan_toggle')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device._setGangOnOff(1, !current).catch(() => {});
          await args.device.setCapabilityValue('onoff', !current).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ ceiling_fan_toggle');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set brightness/speed
    try {
      this.homey.flow.getActionCard('ceiling_fan_set_dim')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness);
          return true;
        });
      this.log('[FLOW] ✅ ceiling_fan_set_dim');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW]  Ceiling fan flow cards registered');
  }
}

module.exports = CeilingFanDriver;
