'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.587: Added flow card run listeners for all conditions and actions
 */
class SwitchWall7gangDriver extends ZigBeeDriver {
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
    this.log('SwitchWall7gangDriver v5.5.587 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const gangs = [1, 2, 3, 4, 5, 6, 7];
    const capMap = { 1: 'onoff', 2: 'onoff.gang2', 3: 'onoff.gang3', 4: 'onoff.gang4', 5: 'onoff.gang5', 6: 'onoff.gang6', 7: 'onoff.gang7' };

    gangs.forEach(gang => {
      try {
        (() => { try { return this.homey.flow.getConditionCard(`switch_wall_7gang_gang${gang}_is_on`); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })()
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            return args.device.getCapabilityValue(capMap[gang]) === true;
          });
        this.log(`[FLOW] ✅ gang${gang}_is_on`);
      } catch (err) { this.log(`[FLOW] ⚠️ gang${gang}_is_on: ${err.message}`); }

      try {
        (() => { try { return this.homey.flow.getActionCard(`switch_wall_7gang_turn_on_gang${gang}`); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })()
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            await args.device.triggerCapabilityListener(capMap[gang], true);
            return true;
          });
        this.log(`[FLOW] ✅ turn_on_gang${gang}`);
      } catch (err) { this.log(`[FLOW] ⚠️ turn_on_gang${gang}: ${err.message}`); }

      try {
        (() => { try { return this.homey.flow.getActionCard(`switch_wall_7gang_turn_off_gang${gang}`); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })()
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            await args.device.triggerCapabilityListener(capMap[gang], false);
            return true;
          });
        this.log(`[FLOW] ✅ turn_off_gang${gang}`);
      } catch (err) { this.log(`[FLOW] ⚠️ turn_off_gang${gang}: ${err.message}`); }

      // v5.5.930: Toggle action
      try {
        (() => { try { return this.homey.flow.getActionCard(`switch_wall_7gang_toggle_gang${gang}`); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })()
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            const current = args.device.getCapabilityValue(capMap[gang]);
            await args.device.triggerCapabilityListener(capMap[gang], !current);
            return true;
          });
        this.log(`[FLOW] ✅ toggle_gang${gang}`);
      } catch (err) { this.log(`[FLOW] ⚠️ toggle_gang${gang}: ${err.message}`); }
    });

    // v5.5.930: LED backlight flow cards
    try {
      (() => { try { return (() => { try { return this.homey.flow.getActionCard('switch_wall_7gang_set_backlight'); } catch(e) { return null; } })(); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device || !args.mode) return false;
          await args.device.setBacklightMode(args.mode);
          return true;
        });
      this.log('[FLOW] ✅ set_backlight');
    } catch (err) { this.log(`[FLOW] ⚠️ set_backlight: ${err.message}`); }

    try {
      (() => { try { return (() => { try { return this.homey.flow.getActionCard('switch_wall_7gang_set_backlight_color'); } catch(e) { return null; } })(); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device || !args.state || !args.color) return false;
          await args.device.setBacklightColor(args.state, args.color);
          return true;
        });
      this.log('[FLOW] ✅ set_backlight_color');
    } catch (err) { this.log(`[FLOW] ⚠️ set_backlight_color: ${err.message}`); }

    try {
      (() => { try { return (() => { try { return this.homey.flow.getActionCard('switch_wall_7gang_set_backlight_brightness'); } catch(e) { return null; } })(); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device || args.brightness === undefined) return false;
          await args.device.setBacklightBrightness(args.brightness);
          return true;
        });
      this.log('[FLOW] ✅ set_backlight_brightness');
    } catch (err) { this.log(`[FLOW] ⚠️ set_backlight_brightness: ${err.message}`); }

    // v5.5.930: All on/off actions
    try {
      (() => { try { return (() => { try { return this.homey.flow.getActionCard('switch_wall_7gang_turn_on_all'); } catch(e) { return null; } })(); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          for (const cap of Object.values(capMap)) {
            if (args.device.hasCapability(cap)) await args.device._setGangOnOff(idx + 1, true).catch(() => {});
            await args.device.setCapabilityValue(cap, true).catch(() => {});
          }
          return true;
        });
      this.log('[FLOW] ✅ turn_on_all');
    } catch (err) { this.log(`[FLOW] ⚠️ turn_on_all: ${err.message}`); }

    try {
      (() => { try { return (() => { try { return this.homey.flow.getActionCard('switch_wall_7gang_turn_off_all'); } catch(e) { return null; } })(); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          for (const cap of Object.values(capMap)) {
            if (args.device.hasCapability(cap)) await args.device._setGangOnOff(idx + 1, false).catch(() => {});
            await args.device.setCapabilityValue(cap, false).catch(() => {});
          }
          return true;
        });
      this.log('[FLOW] ✅ turn_off_all');
    } catch (err) { this.log(`[FLOW] ⚠️ turn_off_all: ${err.message}`); }

    
    // v5.12.5: Scene mode action
    try {
      (() => { try { return (() => { try { return this.homey.flow.getActionCard('switch_wall_7gang_set_scene_mode'); } catch(e) { return null; } })(); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setSceneMode(args.mode);
          return true;
        });
      this.log('[FLOW] \u2705 switch_wall_7gang_set_scene_mode');
    } catch (err) { this.log('[FLOW] ' + err.message); }

    this.log('[FLOW]  All 7-gang switch flow cards registered (v5.5.930)');
  }
}

module.exports = SwitchWall7gangDriver;
