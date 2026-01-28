'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.570: CRITICAL FIX - Flow card run listeners were missing
 */
class TuyaZigbeeDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Tuya Zigbee 2-Gang Switch Driver v5.5.570 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITIONS
    ['gang1', 'gang2'].forEach((gang, idx) => {
      try {
        this.homey.flow.getConditionCard(`switch_2gang_${gang}_is_on`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            const cap = idx === 0 ? 'onoff' : `onoff.${idx + 1}`;
            return args.device.getCapabilityValue(cap) === true;
          });
        this.log(`[FLOW] ✅ switch_2gang_${gang}_is_on`);
      } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }
    });

    // ACTIONS
    ['gang1', 'gang2'].forEach((gang, idx) => {
      try {
        this.homey.flow.getActionCard(`switch_2gang_turn_on_${gang}`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            const cap = idx === 0 ? 'onoff' : `onoff.${idx + 1}`;
            await args.device.setCapabilityValue(cap, true);
            return true;
          });
        this.log(`[FLOW] ✅ switch_2gang_turn_on_${gang}`);
      } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

      try {
        this.homey.flow.getActionCard(`switch_2gang_turn_off_${gang}`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            const cap = idx === 0 ? 'onoff' : `onoff.${idx + 1}`;
            await args.device.setCapabilityValue(cap, false);
            return true;
          });
        this.log(`[FLOW] ✅ switch_2gang_turn_off_${gang}`);
      } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

      // v5.5.906: Toggle actions
      try {
        this.homey.flow.getActionCard(`switch_2gang_toggle_${gang}`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            const cap = idx === 0 ? 'onoff' : `onoff.${idx + 1}`;
            const current = args.device.getCapabilityValue(cap);
            await args.device.setCapabilityValue(cap, !current);
            return true;
          });
        this.log(`[FLOW] ✅ switch_2gang_toggle_${gang}`);
      } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }
    });

    // v5.5.906: All-gangs actions
    try {
      this.homey.flow.getActionCard('switch_2gang_turn_on_all')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', true);
          if (args.device.hasCapability('onoff.gang2')) {
            await args.device.setCapabilityValue('onoff.gang2', true);
          }
          return true;
        });
      this.log('[FLOW] ✅ switch_2gang_turn_on_all');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    try {
      this.homey.flow.getActionCard('switch_2gang_turn_off_all')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', false);
          if (args.device.hasCapability('onoff.gang2')) {
            await args.device.setCapabilityValue('onoff.gang2', false);
          }
          return true;
        });
      this.log('[FLOW] ✅ switch_2gang_turn_off_all');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // v5.5.930: LED backlight flow cards
    try {
      this.homey.flow.getActionCard('switch_2gang_set_backlight')
        .registerRunListener(async (args) => {
          if (!args.device || !args.mode) return false;
          await args.device.setBacklightMode(args.mode);
          return true;
        });
      this.log('[FLOW] ✅ switch_2gang_set_backlight');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    try {
      this.homey.flow.getActionCard('switch_2gang_set_backlight_color')
        .registerRunListener(async (args) => {
          if (!args.device || !args.state || !args.color) return false;
          await args.device.setBacklightColor(args.state, args.color);
          return true;
        });
      this.log('[FLOW] ✅ switch_2gang_set_backlight_color');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    try {
      this.homey.flow.getActionCard('switch_2gang_set_backlight_brightness')
        .registerRunListener(async (args) => {
          if (!args.device || args.brightness === undefined) return false;
          await args.device.setBacklightBrightness(args.brightness);
          return true;
        });
      this.log('[FLOW] ✅ switch_2gang_set_backlight_brightness');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] 🎉 2-Gang switch flow cards registered (v5.5.930)');
  }
}

module.exports = TuyaZigbeeDriver;
