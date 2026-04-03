'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.570: CRITICAL FIX - Flow card run listeners were missing
 */
class TuyaZigbeeDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Tuya Zigbee 3-Gang Switch Driver v5.5.570 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITIONS
    ['gang1', 'gang2', 'gang3'].forEach((gang, idx) => {
      try {
        this.homey.flow.getConditionCard(`switch_3gang_${gang}_is_on`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            const cap = idx === 0 ? 'onoff' : `onoff.gang${idx + 1}`;
            return args.device.getCapabilityValue(cap) === true;
          });
        this.log(`[FLOW] ✅ switch_3gang_${gang}_is_on`);
      } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }
    });

    // ACTIONS
    ['gang1', 'gang2', 'gang3'].forEach((gang, idx) => {
      try {
        this.homey.flow.getActionCard(`switch_3gang_turn_on_${gang}`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            const cap = idx === 0 ? 'onoff' : `onoff.gang${idx + 1}`;
            await args.device._setGangOnOff(idx + 1, true).catch(() => {});
            await args.device.setCapabilityValue(cap, true).catch(() => {});
            return true;
          });
        this.log(`[FLOW] ✅ switch_3gang_turn_on_${gang}`);
      } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

      try {
        this.homey.flow.getActionCard(`switch_3gang_turn_off_${gang}`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            const cap = idx === 0 ? 'onoff' : `onoff.gang${idx + 1}`;
            await args.device._setGangOnOff(idx + 1, false).catch(() => {});
            await args.device.setCapabilityValue(cap, false).catch(() => {});
            return true;
          });
        this.log(`[FLOW] ✅ switch_3gang_turn_off_${gang}`);
      } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }
    });

    // v5.5.930: LED backlight flow cards
    try {
      this.homey.flow.getActionCard('switch_3gang_set_backlight')
        .registerRunListener(async (args) => {
          if (!args.device || !args.mode) return false;
          await args.device.setBacklightMode(args.mode);
          return true;
        });
      this.log('[FLOW] ✅ switch_3gang_set_backlight');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    try {
      this.homey.flow.getActionCard('switch_3gang_set_backlight_color')
        .registerRunListener(async (args) => {
          if (!args.device || !args.state || !args.color) return false;
          await args.device.setBacklightColor(args.state, args.color);
          return true;
        });
      this.log('[FLOW] ✅ switch_3gang_set_backlight_color');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    try {
      this.homey.flow.getActionCard('switch_3gang_set_backlight_brightness')
        .registerRunListener(async (args) => {
          if (!args.device || args.brightness === undefined) return false;
          await args.device.setBacklightBrightness(args.brightness);
          return true;
        });
      this.log('[FLOW] ✅ switch_3gang_set_backlight_brightness');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // v5.12.0: Toggle per gang + all on/off
    ['gang1', 'gang2', 'gang3'].forEach((gang, idx) => {
      try {
        this.homey.flow.getActionCard(`switch_3gang_toggle_${gang}`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            const cap = idx === 0 ? 'onoff' : `onoff.gang${idx + 1}`;
            const v = args.device.getCapabilityValue(cap);
            await args.device._setGangOnOff(idx + 1, !v).catch(() => {});
            await args.device.setCapabilityValue(cap, !v).catch(() => {});
            return true;
          });
      } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }
    });

    try {
      this.homey.flow.getActionCard('switch_3gang_turn_on_all')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, true).catch(() => {});
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          for (let i = 2; i <= 3; i++) {
            if (args.device.hasCapability(`onoff.gang${i}`)) await args.device.triggerCapabilityListener(`onoff.gang${i}`, true);
          }
          return true;
        });
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    try {
      this.homey.flow.getActionCard('switch_3gang_turn_off_all')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, false).catch(() => {});
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          for (let i = 2; i <= 3; i++) {
            if (args.device.hasCapability(`onoff.gang${i}`)) await args.device.triggerCapabilityListener(`onoff.gang${i}`, false);
          }
          return true;
        });
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // v5.12.5: Scene mode action
    try {
      this.homey.flow.getActionCard('switch_3gang_set_scene_mode')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setSceneMode(args.mode);
          return true;
        });
      this.log('[FLOW] \u2705 switch_3gang_set_scene_mode');
    } catch (err) { this.log('[FLOW] \u26A0\uFE0F ' + err.message); }

    this.log('[FLOW] 3-Gang switch flow cards registered (v5.12.0)');
  }
}

module.exports = TuyaZigbeeDriver;
