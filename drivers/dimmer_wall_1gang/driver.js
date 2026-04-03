'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.578: CRITICAL FIX - Flow card run listeners were missing
 * v5.5.476: FIXED - Simplified, SDK3 auto-registers flow cards from driver.flow.compose.json
 */
class Dimmer1gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Dimmer1gangDriver v5.5.578 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Is on
    try {
      this.homey.flow.getConditionCard('dimmer_wall_1gang_dimmer_1gang_is_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW] ✅ dimmer_wall_1gang_dimmer_1gang_is_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn on
    try {
      this.homey.flow.getActionCard('dimmer_wall_1gang_dimmer_1gang_turn_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, true).catch(() => {});
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ dimmer_wall_1gang_dimmer_1gang_turn_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn off
    try {
      this.homey.flow.getActionCard('dimmer_wall_1gang_dimmer_1gang_turn_off')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, false).catch(() => {});
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ dimmer_wall_1gang_dimmer_1gang_turn_off');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Toggle
    try {
      this.homey.flow.getActionCard('dimmer_wall_1gang_dimmer_1gang_toggle')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device._setGangOnOff(1, !current).catch(() => {});
          await args.device.setCapabilityValue('onoff', !current).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ dimmer_wall_1gang_dimmer_1gang_toggle');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set brightness
    try {
      this.homey.flow.getActionCard('dimmer_wall_1gang_dimmer_1gang_set_dim')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness);
          return true;
        });
      this.log('[FLOW] ✅ dimmer_wall_1gang_dimmer_1gang_set_dim');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set brightness with transition
    try {
      this.homey.flow.getActionCard('dimmer_wall_1gang_dimmer_1gang_set_dim_with_transition')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness, { transition: args.transition });
          return true;
        });
      this.log('[FLOW] ✅ dimmer_wall_1gang_dimmer_1gang_set_dim_with_transition');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW]  Dimmer 1-gang flow cards registered');
  }
}

module.exports = Dimmer1gangDriver;
