'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.587: Added flow card run listeners for all conditions and actions
 */
class SwitchWall8gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SwitchWall8gangDriver v5.5.587 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const gangs = [1, 2, 3, 4, 5, 6, 7, 8];
    const capMap = { 1: 'onoff', 2: 'onoff.gang2', 3: 'onoff.gang3', 4: 'onoff.gang4', 5: 'onoff.gang5', 6: 'onoff.gang6', 7: 'onoff.gang7', 8: 'onoff.gang8' };

    gangs.forEach(gang => {
      try {
        this.homey.flow.getConditionCard(`switch_wall_8gang_gang${gang}_is_on`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            return args.device.getCapabilityValue(capMap[gang]) === true;
          });
        this.log(`[FLOW] ✅ gang${gang}_is_on`);
      } catch (err) { this.log(`[FLOW] ⚠️ gang${gang}_is_on: ${err.message}`); }

      try {
        this.homey.flow.getActionCard(`switch_wall_8gang_turn_on_gang${gang}`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            await args.device.setCapabilityValue(capMap[gang], true);
            return true;
          });
        this.log(`[FLOW] ✅ turn_on_gang${gang}`);
      } catch (err) { this.log(`[FLOW] ⚠️ turn_on_gang${gang}: ${err.message}`); }

      try {
        this.homey.flow.getActionCard(`switch_wall_8gang_turn_off_gang${gang}`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            await args.device.setCapabilityValue(capMap[gang], false);
            return true;
          });
        this.log(`[FLOW] ✅ turn_off_gang${gang}`);
      } catch (err) { this.log(`[FLOW] ⚠️ turn_off_gang${gang}: ${err.message}`); }

      // v5.5.930: Toggle action
      try {
        this.homey.flow.getActionCard(`switch_wall_8gang_toggle_gang${gang}`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            const current = args.device.getCapabilityValue(capMap[gang]);
            await args.device.setCapabilityValue(capMap[gang], !current);
            return true;
          });
        this.log(`[FLOW] ✅ toggle_gang${gang}`);
      } catch (err) { this.log(`[FLOW] ⚠️ toggle_gang${gang}: ${err.message}`); }
    });

    // v5.5.930: LED backlight flow cards
    try {
      this.homey.flow.getActionCard('switch_wall_8gang_set_backlight')
        .registerRunListener(async (args) => {
          if (!args.device || !args.mode) return false;
          await args.device.setBacklightMode(args.mode);
          return true;
        });
      this.log('[FLOW] ✅ set_backlight');
    } catch (err) { this.log(`[FLOW] ⚠️ set_backlight: ${err.message}`); }

    try {
      this.homey.flow.getActionCard('switch_wall_8gang_set_backlight_color')
        .registerRunListener(async (args) => {
          if (!args.device || !args.state || !args.color) return false;
          await args.device.setBacklightColor(args.state, args.color);
          return true;
        });
      this.log('[FLOW] ✅ set_backlight_color');
    } catch (err) { this.log(`[FLOW] ⚠️ set_backlight_color: ${err.message}`); }

    try {
      this.homey.flow.getActionCard('switch_wall_8gang_set_backlight_brightness')
        .registerRunListener(async (args) => {
          if (!args.device || args.brightness === undefined) return false;
          await args.device.setBacklightBrightness(args.brightness);
          return true;
        });
      this.log('[FLOW] ✅ set_backlight_brightness');
    } catch (err) { this.log(`[FLOW] ⚠️ set_backlight_brightness: ${err.message}`); }

    // v5.5.930: All on/off actions
    try {
      this.homey.flow.getActionCard('switch_wall_8gang_turn_on_all')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          for (const cap of Object.values(capMap)) {
            if (args.device.hasCapability(cap)) await args.device.setCapabilityValue(cap, true);
          }
          return true;
        });
      this.log('[FLOW] ✅ turn_on_all');
    } catch (err) { this.log(`[FLOW] ⚠️ turn_on_all: ${err.message}`); }

    try {
      this.homey.flow.getActionCard('switch_wall_8gang_turn_off_all')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          for (const cap of Object.values(capMap)) {
            if (args.device.hasCapability(cap)) await args.device.setCapabilityValue(cap, false);
          }
          return true;
        });
      this.log('[FLOW] ✅ turn_off_all');
    } catch (err) { this.log(`[FLOW] ⚠️ turn_off_all: ${err.message}`); }

    this.log('[FLOW] 🎉 All 8-gang switch flow cards registered (v5.5.930)');
  }
}

module.exports = SwitchWall8gangDriver;
