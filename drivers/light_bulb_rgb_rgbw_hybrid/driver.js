'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartBulbRgbDriver extends ZigBeeDriver {
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
    this.log('SmartBulbRgbDriver v5.5.574 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('light_bulb_rgb_rgbw_hybrid_bulb_rgb_smart_bulb_rgb_turned_on_light_bulb_rgb_rgbw_hybrid'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('light_bulb_rgb_rgbw_hybrid_bulb_rgb_smart_bulb_rgb_turned_off_light_bulb_rgb_rgbw_hybrid'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('light_bulb_rgb_rgbw_hybrid_bulb_rgb_smart_bulb_rgb_dim_changed_light_bulb_rgb_rgbw_hybrid'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('light_bulb_rgb_rgbw_hybrid_bulb_rgb_turned_on_light_bulb_rgb_rgbw_hybrid'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('light_bulb_rgb_rgbw_hybrid_bulb_rgb_turned_off_light_bulb_rgb_rgbw_hybrid'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('light_bulb_rgb_rgbw_hybrid_bulb_rgb_battery_low_light_bulb_rgb_rgbw_hybrid'); } catch (e) {}

    // CONDITIONS
    try {
      const card = const card = this.homey.flow.getConditionCard('light_bulb_rgb_rgbw_hybrid_bulb_rgb_smart_bulb_rgb_is_on_light_bulb_rgb_rgbw_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition light_bulb_rgb_rgbw_hybrid_bulb_rgb_smart_bulb_rgb_is_on_light_bulb_rgb_rgbw_hybrid: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('light_bulb_rgb_rgbw_hybrid_bulb_rgb_is_on_light_bulb_rgb_rgbw_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition light_bulb_rgb_rgbw_hybrid_bulb_rgb_is_on_light_bulb_rgb_rgbw_hybrid: ${err.message}`); }

    // ACTIONS
    try {
      const card = const card = this.homey.flow.getActionCard('light_bulb_rgb_rgbw_hybrid_bulb_rgb_smart_bulb_rgb_turn_on_light_bulb_rgb_rgbw_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action light_bulb_rgb_rgbw_hybrid_bulb_rgb_smart_bulb_rgb_turn_on_light_bulb_rgb_rgbw_hybrid: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('light_bulb_rgb_rgbw_hybrid_bulb_rgb_smart_bulb_rgb_turn_off_light_bulb_rgb_rgbw_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action light_bulb_rgb_rgbw_hybrid_bulb_rgb_smart_bulb_rgb_turn_off_light_bulb_rgb_rgbw_hybrid: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('light_bulb_rgb_rgbw_hybrid_bulb_rgb_smart_bulb_rgb_toggle_light_bulb_rgb_rgbw_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action light_bulb_rgb_rgbw_hybrid_bulb_rgb_smart_bulb_rgb_toggle_light_bulb_rgb_rgbw_hybrid: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('light_bulb_rgb_rgbw_hybrid_bulb_rgb_smart_bulb_rgb_set_dim_light_bulb_rgb_rgbw_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action light_bulb_rgb_rgbw_hybrid_bulb_rgb_smart_bulb_rgb_set_dim_light_bulb_rgb_rgbw_hybrid: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('light_bulb_rgb_rgbw_hybrid_bulb_rgb_turn_on_light_bulb_rgb_rgbw_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action light_bulb_rgb_rgbw_hybrid_bulb_rgb_turn_on_light_bulb_rgb_rgbw_hybrid: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('light_bulb_rgb_rgbw_hybrid_bulb_rgb_turn_off_light_bulb_rgb_rgbw_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action light_bulb_rgb_rgbw_hybrid_bulb_rgb_turn_off_light_bulb_rgb_rgbw_hybrid: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('light_bulb_rgb_rgbw_hybrid_bulb_rgb_toggle_light_bulb_rgb_rgbw_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action light_bulb_rgb_rgbw_hybrid_bulb_rgb_toggle_light_bulb_rgb_rgbw_hybrid: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('light_bulb_rgb_rgbw_hybrid_bulb_rgb_set_brightness_light_bulb_rgb_rgbw_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action light_bulb_rgb_rgbw_hybrid_bulb_rgb_set_brightness_light_bulb_rgb_rgbw_hybrid: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = SmartBulbRgbDriver;
