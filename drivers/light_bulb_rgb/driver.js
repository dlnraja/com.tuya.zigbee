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
    const _triggerIds = ["light_bulb_rgb_bulb_rgb_smart_bulb_rgb_turned_on","light_bulb_rgb_bulb_rgb_smart_bulb_rgb_turned_off","light_bulb_rgb_bulb_rgb_smart_bulb_rgb_dim_changed","light_bulb_rgb_bulb_rgb_turned_on","light_bulb_rgb_bulb_rgb_turned_off","light_bulb_rgb_bulb_rgb_battery_low"];
    for (const _tid of _triggerIds) {
      try {
        const _card = this._getFlowCard(_tid, "trigger");
        if (_card) {
          _card.registerRunListener(async (args) => {
            if (!args.device) return;
            args.device.emit("flow:" + _tid, args);
          });
        }
      } catch (_err) { this.error("Trigger " + _tid + ": " + _err.message); }
    }
    // END TRIGGERS
    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('light_bulb_rgb_bulb_rgb_smart_bulb_rgb_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition light_bulb_rgb_bulb_rgb_smart_bulb_rgb_is_on: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('light_bulb_rgb_bulb_rgb_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition light_bulb_rgb_bulb_rgb_is_on: ${err.message}`); }; }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('light_bulb_rgb_bulb_rgb_smart_bulb_rgb_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action light_bulb_rgb_bulb_rgb_smart_bulb_rgb_turn_on: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('light_bulb_rgb_bulb_rgb_smart_bulb_rgb_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action light_bulb_rgb_bulb_rgb_smart_bulb_rgb_turn_off: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('light_bulb_rgb_bulb_rgb_smart_bulb_rgb_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action light_bulb_rgb_bulb_rgb_smart_bulb_rgb_toggle: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('light_bulb_rgb_bulb_rgb_smart_bulb_rgb_set_dim');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action light_bulb_rgb_bulb_rgb_smart_bulb_rgb_set_dim: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('light_bulb_rgb_bulb_rgb_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action light_bulb_rgb_bulb_rgb_turn_on: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('light_bulb_rgb_bulb_rgb_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action light_bulb_rgb_bulb_rgb_turn_off: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('light_bulb_rgb_bulb_rgb_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action light_bulb_rgb_bulb_rgb_toggle: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('light_bulb_rgb_bulb_rgb_set_brightness');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action light_bulb_rgb_bulb_rgb_set_brightness: ${err.message}`); }; }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = SmartBulbRgbDriver;

