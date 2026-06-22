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
    const triggers = [
      'air_purifier_switch_switch_1gang_turned_on',
      'air_purifier_switch_switch_1gang_turned_off',
      'air_purifier_switch_switch_1gang_physical_on',
      'air_purifier_switch_switch_1gang_physical_off',
      'air_purifier_switch_switch_1gang_physical_single',
      'air_purifier_switch_switch_1gang_physical_double',
      'air_purifier_switch_switch_1gang_physical_long_press',
      'air_purifier_switch_switch_1gang_physical_triple',
      'air_purifier_switch_switch_1gang_battery_low',
      'air_purifier_switch_switch_1gang_power_changed',
      'air_purifier_switch_switch_1gang_gang1_scene',
    ];
    for (const id of triggers) {
      try {
        const card = this._getFlowCard(id, 'trigger');
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) return;
            args.device.emit(`flow:${id}`, args);
          });
        }
      } catch (err) { this.error(`Trigger ${id}: ${err.message}`); }
    }

    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('air_purifier_switch_switch_1gang_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition air_purifier_switch_switch_1gang_is_on: ${err.message}`); }; }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('air_purifier_switch_switch_1gang_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action air_purifier_switch_switch_1gang_turn_on: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('air_purifier_switch_switch_1gang_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action air_purifier_switch_switch_1gang_turn_off: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('air_purifier_switch_switch_1gang_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action air_purifier_switch_switch_1gang_toggle: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('air_purifier_switch_switch_1gang_set_backlight');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.setBacklightMode === 'function') await args.device.setBacklightMode(args.mode || args.value);
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action air_purifier_switch_switch_1gang_set_backlight: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('air_purifier_switch_switch_1gang_set_backlight_color');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.setBacklightMode === 'function') await args.device.setBacklightMode(args.mode || args.value);
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action air_purifier_switch_switch_1gang_set_backlight_color: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('air_purifier_switch_switch_1gang_set_backlight_brightness');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.setBacklightMode === 'function') await args.device.setBacklightMode(args.mode || args.value);
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action air_purifier_switch_switch_1gang_set_backlight_brightness: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('air_purifier_switch_switch_1gang_set_countdown');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action air_purifier_switch_switch_1gang_set_countdown triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action air_purifier_switch_switch_1gang_set_countdown: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('air_purifier_switch_switch_1gang_set_child_lock');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action air_purifier_switch_switch_1gang_set_child_lock triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action air_purifier_switch_switch_1gang_set_child_lock: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('air_purifier_switch_switch_1gang_set_scene_mode');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.setSceneMode === 'function') await args.device.setSceneMode(args.mode || args.value);
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action air_purifier_switch_switch_1gang_set_scene_mode: ${err.message}`); }; }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = TuyaZigbeeDriver;

