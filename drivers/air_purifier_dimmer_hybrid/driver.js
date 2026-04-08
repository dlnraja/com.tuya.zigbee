'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.578: CRITICAL FIX - Flow card run listeners were missing
 * v5.5.476: FIXED - Simplified, SDK3 auto-registers flow cards from driver.flow.compose.json
 */
class Dimmer1gangDriver extends ZigBeeDriver {
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
    this.log('Dimmer1gangDriver v5.5.578 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Is on
    try {
      (() => { try { return this.homey.flow.getDeviceConditionCard('dimmer_wall_1gang_dimmer_1gang_is_on'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW] ✅ dimmer_wall_1gang_dimmer_1gang_is_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn on
    try {
      (() => { try { return this.homey.flow.getDeviceActionCard('dimmer_wall_1gang_dimmer_1gang_turn_on'); } catch(e) { return null; } })()
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
      (() => { try { return this.homey.flow.getDeviceActionCard('dimmer_wall_1gang_dimmer_1gang_turn_off'); } catch(e) { return null; } })()
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
      (() => { try { return this.homey.flow.getDeviceActionCard('dimmer_wall_1gang_dimmer_1gang_toggle'); } catch(e) { return null; } })()
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
      (() => { try { return this.homey.flow.getDeviceActionCard('dimmer_wall_1gang_dimmer_1gang_set_dim'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness);
          return true;
        });
      this.log('[FLOW] ✅ dimmer_wall_1gang_dimmer_1gang_set_dim');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set brightness with transition
    try {
      (() => { try { return this.homey.flow.getDeviceActionCard('dimmer_wall_1gang_dimmer_1gang_set_dim_with_transition'); } catch(e) { return null; } })()
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
