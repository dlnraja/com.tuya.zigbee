'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchWall8gangDriver extends ZigBeeDriver {
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
    this.log('SwitchWall8gangDriver v5.5.587 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang1_turned_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang1_turned_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang2_turned_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang2_turned_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang3_turned_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang3_turned_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang4_turned_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang4_turned_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang5_turned_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang5_turned_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang6_turned_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang6_turned_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang7_turned_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang7_turned_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang8_turned_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang8_turned_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_turned_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_turned_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang1_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang1_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang1_single'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang1_double'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang1_triple'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang1_long_press'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang2_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang2_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang2_single'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang2_double'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang2_triple'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang2_long_press'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang3_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang3_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang3_single'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang3_double'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang3_triple'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang3_long_press'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang4_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang4_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang4_single'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang4_double'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang4_triple'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang4_long_press'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang5_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang5_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang5_single'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang5_double'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang5_triple'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang5_long_press'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang6_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang6_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang6_single'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang6_double'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang6_triple'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang6_long_press'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang7_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang7_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang7_single'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang7_double'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang7_triple'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang7_long_press'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang8_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang8_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang8_single'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang8_double'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang8_triple'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_physical_gang8_long_press'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang1_scene'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang2_scene'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang3_scene'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang4_scene'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang5_scene'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang6_scene'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang7_scene'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('switch_wall_8gang_gang8_scene'); } catch (e) {}

    // CONDITIONS
    try {
      const card = const card = this.homey.flow.getConditionCard('switch_wall_8gang_gang1_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition switch_wall_8gang_gang1_is_on: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('switch_wall_8gang_gang2_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition switch_wall_8gang_gang2_is_on: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('switch_wall_8gang_gang3_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition switch_wall_8gang_gang3_is_on: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('switch_wall_8gang_gang4_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition switch_wall_8gang_gang4_is_on: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('switch_wall_8gang_gang5_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition switch_wall_8gang_gang5_is_on: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('switch_wall_8gang_gang6_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition switch_wall_8gang_gang6_is_on: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('switch_wall_8gang_gang7_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition switch_wall_8gang_gang7_is_on: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('switch_wall_8gang_gang8_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition switch_wall_8gang_gang8_is_on: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('switch_wall_8gang_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition switch_wall_8gang_is_on: ${err.message}`); }

    // ACTIONS
    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_turn_on_gang1');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_turn_on_gang1: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_turn_off_gang1');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_turn_off_gang1: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_turn_on_gang2');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_turn_on_gang2: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_turn_off_gang2');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_turn_off_gang2: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_turn_on_gang3');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_turn_on_gang3: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_turn_off_gang3');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_turn_off_gang3: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_turn_on_gang4');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_turn_on_gang4: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_turn_off_gang4');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_turn_off_gang4: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_turn_on_gang5');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_turn_on_gang5: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_turn_off_gang5');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_turn_off_gang5: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_turn_on_gang6');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_turn_on_gang6: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_turn_off_gang6');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_turn_off_gang6: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_turn_on_gang7');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_turn_on_gang7: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_turn_off_gang7');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_turn_off_gang7: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_turn_on_gang8');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_turn_on_gang8: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_turn_off_gang8');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_turn_off_gang8: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_toggle_gang1');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_toggle_gang1: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_toggle_gang2');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_toggle_gang2: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_toggle_gang3');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_toggle_gang3: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_toggle_gang4');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_toggle_gang4: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_toggle_gang5');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_toggle_gang5: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_toggle_gang6');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_toggle_gang6: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_toggle_gang7');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_toggle_gang7: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_toggle_gang8');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_toggle_gang8: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_turn_on_all');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const caps = Object.keys(args.device.getCapabilities()).filter(c => c.startsWith('onoff'));
          for (const cap of caps) { await args.device.triggerCapabilityListener(cap, true).catch(() => {}); }
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_turn_on_all: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_turn_off_all');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const caps = Object.keys(args.device.getCapabilities()).filter(c => c.startsWith('onoff'));
          for (const cap of caps) { await args.device.triggerCapabilityListener(cap, false).catch(() => {}); }
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_turn_off_all: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_set_backlight');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.setBacklightMode === 'function') await args.device.setBacklightMode(args.mode || args.value);
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_set_backlight: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_set_backlight_color');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.setBacklightMode === 'function') await args.device.setBacklightMode(args.mode || args.value);
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_set_backlight_color: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_set_backlight_brightness');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.setBacklightMode === 'function') await args.device.setBacklightMode(args.mode || args.value);
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_set_backlight_brightness: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_turn_on: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_turn_off: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_toggle: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('switch_wall_8gang_set_scene_mode');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.setSceneMode === 'function') await args.device.setSceneMode(args.mode || args.value);
          return true;
        });
      }
    } catch (err) { this.error(`Action switch_wall_8gang_set_scene_mode: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = SwitchWall8gangDriver;
