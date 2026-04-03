'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.578: CRITICAL FIX - Flow card run listeners were missing
 */
class DimmerDualChannelDriver extends ZigBeeDriver {

  async onInit() {
    this.log('DimmerDualChannelDriver v5.5.578 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Is on
    try {
      this.homey.flow.getConditionCard('dimmer_dual_channel_is_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW] ✅ dimmer_dual_channel_is_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Dim above
    try {
      this.homey.flow.getConditionCard('dimmer_dual_channel_dim_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const dim = args.device.getCapabilityValue('dim') || 0;
          return (dim * 100) > args.level;
        });
      this.log('[FLOW] ✅ dimmer_dual_channel_dim_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn on
    try {
      this.homey.flow.getActionCard('dimmer_dual_channel_turn_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', true);
          return true;
        });
      this.log('[FLOW] ✅ dimmer_dual_channel_turn_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn off
    try {
      this.homey.flow.getActionCard('dimmer_dual_channel_turn_off')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', false);
          return true;
        });
      this.log('[FLOW] ✅ dimmer_dual_channel_turn_off');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Toggle
    try {
      this.homey.flow.getActionCard('dimmer_dual_channel_toggle')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.setCapabilityValue('onoff', !current);
          return true;
        });
      this.log('[FLOW] ✅ dimmer_dual_channel_toggle');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set dim level
    try {
      this.homey.flow.getActionCard('dimmer_dual_channel_set_dim')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('dim', args.level / 100);
          return true;
        });
      this.log('[FLOW] ✅ dimmer_dual_channel_set_dim');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Dim up
    try {
      this.homey.flow.getActionCard('dimmer_dual_channel_dim_up')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('dim') || 0;
          await args.device.setCapabilityValue('dim', Math.min(1, current + 0.1));
          return true;
        });
      this.log('[FLOW] ✅ dimmer_dual_channel_dim_up');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Dim down
    try {
      this.homey.flow.getActionCard('dimmer_dual_channel_dim_down')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('dim') || 0;
          await args.device.setCapabilityValue('dim', Math.max(0, current - 0.1));
          return true;
        });
      this.log('[FLOW] ✅ dimmer_dual_channel_dim_down');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] 🎉 Dimmer dual channel flow cards registered');
  }
}

module.exports = DimmerDualChannelDriver;
