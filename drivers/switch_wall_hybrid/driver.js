'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.570: CRITICAL FIX - Flow card run listeners were missing
 */
class TuyaZigbeeDriver extends ZigBeeDriver {
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

    this.log('Tuya Zigbee 1-Gang Switch Driver v5.5.570 initialized');
    this._registerFlowCards();
  
  
  
  
  }

  _registerFlowCards() {
    // CONDITION: Switch is on/off
    try {
      this.homey.flow.getConditionCard('switch_1gang_is_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW] ✅ Registered: switch_1gang_is_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn on
    try {
      this.homey.flow.getConditionCard('switch_1gang_turn_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, true).catch(() => {});
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ Registered: switch_1gang_turn_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn off
    try {
      this.homey.flow.getConditionCard('switch_1gang_turn_off')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, false).catch(() => {});
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ Registered: switch_1gang_turn_off');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // v5.5.906: ACTION: Toggle
    try {
      this.homey.flow.getConditionCard('switch_1gang_toggle')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device._setGangOnOff(1, !current).catch(() => {});
          await args.device.setCapabilityValue('onoff', !current).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ Registered: switch_1gang_toggle');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // v5.5.930: ACTION: Set LED backlight mode
    try {
      this.homey.flow.getActionCard('switch_1gang_set_backlight')
        .registerRunListener(async (args) => {
          if (!args.device || !args.mode) return false;
          await args.device.setBacklightMode(args.mode);
          return true;
        });
      this.log('[FLOW] ✅ Registered: switch_1gang_set_backlight');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // v5.5.930: ACTION: Set LED backlight color
    try {
      this.homey.flow.getActionCard('switch_1gang_set_backlight_color')
        .registerRunListener(async (args) => {
          if (!args.device || !args.state || !args.color) return false;
          await args.device.setBacklightColor(args.state, args.color);
          return true;
        });
      this.log('[FLOW] ✅ Registered: switch_1gang_set_backlight_color');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // v5.5.930: ACTION: Set LED backlight brightness
    try {
      this.homey.flow.getActionCard('switch_1gang_set_backlight_brightness')
        .registerRunListener(async (args) => {
          if (!args.device || args.brightness === undefined) return false;
          await args.device.setBacklightBrightness(args.brightness);
          return true;
        });
      this.log('[FLOW] ✅ Registered: switch_1gang_set_backlight_brightness');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] \uD83C\uDF89 Scene mode registered');
    // v5.12.5: Scene mode action
    try {

        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setSceneMode(args.mode);
          return true;
        });
      this.log('[FLOW] \u2705 switch_1gang_set_scene_mode');
    } catch (err) { this.log('[FLOW] \u26A0\uFE0F ' + err.message); }

    this.log('[FLOW] 1-Gang switch flow cards registered (v5.5.930)');
  }
}

module.exports = TuyaZigbeeDriver;
