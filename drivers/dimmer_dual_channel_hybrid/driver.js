'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.578: CRITICAL FIX - Flow card run listeners were missing
 */
class DimmerDualChannelDriver extends ZigBeeDriver {
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
    this.log('DimmerDualChannelDriver v5.5.578 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Is on
    try {
      (() => { try { return (() => { try { return this.homey.flow.getConditionCard('dimmer_dual_channel_is_on'); } catch(e) { return null; } })(); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW] ✅ dimmer_dual_channel_is_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Dim above
    try {
      (() => { try { return (() => { try { return this.homey.flow.getConditionCard('dimmer_dual_channel_dim_above'); } catch(e) { return null; } })(); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const dim = args.device.getCapabilityValue('dim') || 0;
          return (dim * 100) > args.level;
        });
      this.log('[FLOW] ✅ dimmer_dual_channel_dim_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn on
    try {
      (() => { try { return (() => { try { return this.homey.flow.getActionCard('dimmer_dual_channel_turn_on'); } catch(e) { return null; } })(); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, true).catch(() => {});
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ dimmer_dual_channel_turn_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn off
    try {
      (() => { try { return (() => { try { return this.homey.flow.getActionCard('dimmer_dual_channel_turn_off'); } catch(e) { return null; } })(); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, false).catch(() => {});
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ dimmer_dual_channel_turn_off');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Toggle
    try {
      (() => { try { return (() => { try { return this.homey.flow.getActionCard('dimmer_dual_channel_toggle'); } catch(e) { return null; } })(); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device._setGangOnOff(1, !current).catch(() => {});
          await args.device.setCapabilityValue('onoff', !current).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ dimmer_dual_channel_toggle');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set dim level
    try {
      (() => { try { return (() => { try { return this.homey.flow.getActionCard('dimmer_dual_channel_set_dim'); } catch(e) { return null; } })(); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.level / 100);
          return true;
        });
      this.log('[FLOW] ✅ dimmer_dual_channel_set_dim');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Dim up
    try {
      (() => { try { return (() => { try { return this.homey.flow.getActionCard('dimmer_dual_channel_dim_up'); } catch(e) { return null; } })(); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('dim') || 0;
          await args.device.triggerCapabilityListener('dim', Math.min(1, current + 0.1));
          return true;
        });
      this.log('[FLOW] ✅ dimmer_dual_channel_dim_up');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Dim down
    try {
      (() => { try { return (() => { try { return this.homey.flow.getActionCard('dimmer_dual_channel_dim_down'); } catch(e) { return null; } })(); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('dim') || 0;
          await args.device.triggerCapabilityListener('dim', Math.max(0, current - 0.1));
          return true;
        });
      this.log('[FLOW] ✅ dimmer_dual_channel_dim_down');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW]  Dimmer dual channel flow cards registered');
  }
}

module.exports = DimmerDualChannelDriver;
