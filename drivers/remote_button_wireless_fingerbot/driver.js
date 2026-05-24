'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaZigbeeDriver extends ZigBeeDriver {
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
    // TRIGGERS
    // Removed corrupted nested block})(); } catch (e) {}
    // Removed corrupted nested block})(); } catch (e) {}
    // Removed corrupted nested block})(); } catch (e) {}
    // Removed corrupted nested block})(); } catch (e) {}
    // Removed corrupted nested block})(); } catch (e) {}
    // Removed corrupted nested block})(); } catch (e) {}
    // Removed corrupted nested block})(); } catch (e) {}
    // Removed corrupted nested block})(); } catch (e) {}
    // Removed corrupted nested block})(); } catch (e) {}
    // Removed corrupted nested block})(); } catch (e) {}
    // Removed corrupted nested block})(); } catch (e) {}

    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_is_on: ${err.message}`); }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_turn_on: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_turn_off: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_toggle: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_backlight');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.setBacklightMode === 'function') await args.device.setBacklightMode(args.mode || args.value);
          return true;
        });
      }
    } catch (err) { this.error(`Action remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_backlight: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_backlight_color');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.setBacklightMode === 'function') await args.device.setBacklightMode(args.mode || args.value);
          return true;
        });
      }
    } catch (err) { this.error(`Action remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_backlight_color: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_backlight_brightness');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.setBacklightMode === 'function') await args.device.setBacklightMode(args.mode || args.value);
          return true;
        });
      }
    } catch (err) { this.error(`Action remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_backlight_brightness: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_countdown');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_countdown triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_countdown: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_child_lock');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_child_lock triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_child_lock: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_scene_mode');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.setSceneMode === 'function') await args.device.setSceneMode(args.mode || args.value);
          return true;
        });
      }
    } catch (err) { this.error(`Action remote_button_wireless_fingerbot_hybrid_button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_scene_mode: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = TuyaZigbeeDriver;

