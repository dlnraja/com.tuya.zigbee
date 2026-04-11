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
    this.homey.flow.getTriggerCard('switch_3gang_gang3_scene');
    this.homey.flow.getTriggerCard('switch_3gang_gang2_scene');
    this.homey.flow.getTriggerCard('switch_3gang_gang1_scene');
    this.homey.flow.getTriggerCard('switch_3gang_physical_gang3_off');
    this.homey.flow.getTriggerCard('switch_3gang_physical_gang3_on');
    this.homey.flow.getTriggerCard('switch_3gang_physical_gang2_off');
    this.homey.flow.getTriggerCard('switch_3gang_physical_gang2_on');
    this.homey.flow.getTriggerCard('switch_3gang_physical_gang1_off');
    this.homey.flow.getTriggerCard('switch_3gang_physical_gang1_on');
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
            try { await args.device.triggerCapabilityListener(cap, true); } catch(e) {}
            return true;
          });
        this.log(`[FLOW] ✅ switch_3gang_turn_on_${gang}`);
      } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

      try {
        this.homey.flow.getActionCard(`switch_3gang_turn_off_${gang}`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            const cap = idx === 0 ? 'onoff' : `onoff.gang${idx + 1}`;
            try { await args.device.triggerCapabilityListener(cap, false); } catch(e) {}
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
            try { await args.device.triggerCapabilityListener(cap, !v); } catch(e) {}
            return true;
          });
      } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }
    });

    try {
      this.homey.flow.getActionCard('switch_3gang_turn_on_all')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          for (let i = 1; i <= 3; i++) {
            const cap = i === 1 ? 'onoff' : `onoff.gang${i}`;
            if (args.device.hasCapability(cap)) {
               try { await args.device.triggerCapabilityListener(cap, true); } catch(e) {}
            }
          }
          return true;
        });
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    try {
      this.homey.flow.getActionCard('switch_3gang_turn_off_all')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          for (let i = 1; i <= 3; i++) {
            const cap = i === 1 ? 'onoff' : `onoff.gang${i}`;
            if (args.device.hasCapability(cap)) {
               try { await args.device.triggerCapabilityListener(cap, false); } catch(e) {}
            }
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
      this.log('[FLOW] ✅ switch_3gang_set_scene_mode');
    } catch (err) { this.log('[FLOW] ⚠️ ' + err.message); }

    this.log('[FLOW] 3-Gang switch flow cards registered (v5.12.0)');
  }
}

module.exports = TuyaZigbeeDriver;
