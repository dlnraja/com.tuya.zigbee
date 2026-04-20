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
    try { this.homey.flow.getTriggerCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_turned_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_turned_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_physical_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_physical_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_physical_single'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_physical_double'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_physical_long_press'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_physical_triple'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_battery_low'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_power_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_gang1_scene'); } catch (e) {}

    // CONDITIONS
    try {
      const card = this._getFlowCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_is_on', 'condition');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_is_on: ${err.message}`); }

    // ACTIONS
    try {
      const card = this._getFlowCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_turn_on', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_turn_on: ${err.message}`); }

    try {
      const card = this._getFlowCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_turn_off', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_turn_off: ${err.message}`); }

    try {
      const card = this._getFlowCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_toggle', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_toggle: ${err.message}`); }

    try {
      const card = this._getFlowCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_backlight', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.setBacklightMode === 'function') await args.device.setBacklightMode(args.mode || args.value);
          return true;
        });
      }
    } catch (err) { this.error(`Action button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_backlight: ${err.message}`); }

    try {
      const card = this._getFlowCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_backlight_color', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.setBacklightMode === 'function') await args.device.setBacklightMode(args.mode || args.value);
          return true;
        });
      }
    } catch (err) { this.error(`Action button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_backlight_color: ${err.message}`); }

    try {
      const card = this._getFlowCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_backlight_brightness', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.setBacklightMode === 'function') await args.device.setBacklightMode(args.mode || args.value);
          return true;
        });
      }
    } catch (err) { this.error(`Action button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_backlight_brightness: ${err.message}`); }

    try {
      const card = this._getFlowCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_countdown', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_countdown triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_countdown: ${err.message}`); }

    try {
      const card = this._getFlowCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_child_lock', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_child_lock triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_child_lock: ${err.message}`); }

    try {
      const card = this._getFlowCard('button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_scene_mode', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.setSceneMode === 'function') await args.device.setSceneMode(args.mode || args.value);
          return true;
        });
      }
    } catch (err) { this.error(`Action button_wireless_fingerbot_hybrid_fingerbot_switch_hybrid_switch_1gang_set_scene_mode: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = TuyaZigbeeDriver;
