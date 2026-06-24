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
        const card = this.homey.flow.getConditionCard(`switch_3gang_${gang}_is_on`);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) return false;
            const cap = idx === 0 ? 'onoff' : `onoff.gang${idx + 1}`;
            return args.device.getCapabilityValue(cap) === true;
          });
          this.log(`[FLOW] ✅ switch_3gang_${gang}_is_on registered`);
        }
      } catch (err) {
        this.error(`[FLOW] Failed to register switch_3gang_${gang}_is_on:`, err.message);
      }
    });

    // ACTIONS - Turn On / Turn Off
    ['gang1', 'gang2', 'gang3'].forEach((gang, idx) => {
      try {
        const cardOn = this.homey.flow.getActionCard(`switch_3gang_turn_on_${gang}`);
        if (cardOn) {
          cardOn.registerRunListener(async (args) => {
            if (!args.device) return false;
            const cap = idx === 0 ? 'onoff' : `onoff.gang${idx + 1}`;
            await args.device._setGangOnOff(idx + 1, true).catch(() => {});
            await args.device.setCapabilityValue(cap, true).catch(() => {});
            return true;
          });
          this.log(`[FLOW] ✅ switch_3gang_turn_on_${gang} registered`);
        }
      } catch (err) {
        this.error(`[FLOW] Failed to register switch_3gang_turn_on_${gang}:`, err.message);
      }

      try {
        const cardOff = this.homey.flow.getActionCard(`switch_3gang_turn_off_${gang}`);
        if (cardOff) {
          cardOff.registerRunListener(async (args) => {
            if (!args.device) return false;
            const cap = idx === 0 ? 'onoff' : `onoff.gang${idx + 1}`;
            await args.device._setGangOnOff(idx + 1, false).catch(() => {});
            await args.device.setCapabilityValue(cap, false).catch(() => {});
            return true;
          });
          this.log(`[FLOW] ✅ switch_3gang_turn_off_${gang} registered`);
        }
      } catch (err) {
        this.error(`[FLOW] Failed to register switch_3gang_turn_off_${gang}:`, err.message);
      }

      try {
        const cardToggle = this.homey.flow.getActionCard(`switch_3gang_toggle_${gang}`);
        if (cardToggle) {
          cardToggle.registerRunListener(async (args) => {
            if (!args.device) return false;
            const cap = idx === 0 ? 'onoff' : `onoff.gang${idx + 1}`;
            const v = args.device.getCapabilityValue(cap);
            await args.device._setGangOnOff(idx + 1, !v).catch(() => {});
            await args.device.setCapabilityValue(cap, !v).catch(() => {});
            return true;
          });
          this.log(`[FLOW] ✅ switch_3gang_toggle_${gang} registered`);
        }
      } catch (err) {
        this.error(`[FLOW] Failed to register switch_3gang_toggle_${gang}:`, err.message);
      }
    });

    // Backlight controls
    try {
      const card = this.homey.flow.getActionCard('switch_3gang_set_backlight');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device || !args.mode) return false;
          await args.device.setBacklightMode(args.mode);
          return true;
        });
        this.log('[FLOW] ✅ switch_3gang_set_backlight registered');
      }
    } catch (err) {
      this.error('[FLOW] Failed to register switch_3gang_set_backlight:', err.message);
    }

    try {
      const card = this.homey.flow.getActionCard('switch_3gang_set_backlight_color');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device || !args.state || !args.color) return false;
          await args.device.setBacklightColor(args.state, args.color);
          return true;
        });
        this.log('[FLOW] ✅ switch_3gang_set_backlight_color registered');
      }
    } catch (err) {
      this.error('[FLOW] Failed to register switch_3gang_set_backlight_color:', err.message);
    }

    try {
      const card = this.homey.flow.getActionCard('switch_3gang_set_backlight_brightness');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device || args.brightness === undefined) return false;
          await args.device.setBacklightBrightness(args.brightness);
          return true;
        });
        this.log('[FLOW] ✅ switch_3gang_set_backlight_brightness registered');
      }
    } catch (err) {
      this.error('[FLOW] Failed to register switch_3gang_set_backlight_brightness:', err.message);
    }

    // Turn all on / off
    try {
      const card = this.homey.flow.getActionCard('switch_3gang_turn_on_all');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, true).catch(() => {});
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          for (let i = 2; i <= 3; i++) {
            if (args.device.hasCapability(`onoff.gang${i}`)) {
              await args.device['setCapabilityValue'](`onoff.gang${i}`, true).catch(() => {});
            }
          }
          return true;
        });
        this.log('[FLOW] ✅ switch_3gang_turn_on_all registered');
      }
    } catch (err) {
      this.error('[FLOW] Failed to register switch_3gang_turn_on_all:', err.message);
    }

    try {
      const card = this.homey.flow.getActionCard('switch_3gang_turn_off_all');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, false).catch(() => {});
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          for (let i = 2; i <= 3; i++) {
            if (args.device.hasCapability(`onoff.gang${i}`)) {
              await args.device['setCapabilityValue'](`onoff.gang${i}`, false).catch(() => {});
            }
          }
          return true;
        });
        this.log('[FLOW] ✅ switch_3gang_turn_off_all registered');
      }
    } catch (err) {
      this.error('[FLOW] Failed to register switch_3gang_turn_off_all:', err.message);
    }

    // Scene mode
    try {
      const card = this.homey.flow.getActionCard('switch_3gang_set_scene_mode');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setSceneMode(args.mode);
          return true;
        });
        this.log('[FLOW] ✅ switch_3gang_set_scene_mode registered');
      }
    } catch (err) {
      this.error('[FLOW] Failed to register switch_3gang_set_scene_mode:', err.message);
    }

    this.log('[FLOW] 3-Gang switch flow cards registered (v5.12.0)');
  }
}

module.exports = TuyaZigbeeDriver;
