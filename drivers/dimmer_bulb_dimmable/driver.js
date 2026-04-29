'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartBulbDimmerDriver extends ZigBeeDriver {
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
    this.log('SmartBulbDimmerDriver v5.5.571 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}

    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('dimmer_bulb_dimmable_hybrid_bulb_dimmable_dimmer_hybrid_bulb_dimmable_smart_bulb_dimmer_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition dimmer_bulb_dimmable_hybrid_bulb_dimmable_dimmer_hybrid_bulb_dimmable_smart_bulb_dimmer_is_on: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('dimmer_bulb_dimmable_hybrid_bulb_dimmable_dimmer_hybrid_bulb_dimmable_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition dimmer_bulb_dimmable_hybrid_bulb_dimmable_dimmer_hybrid_bulb_dimmable_is_on: ${err.message}`); }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('dimmer_bulb_dimmable_hybrid_bulb_dimmable_dimmer_hybrid_bulb_dimmable_smart_bulb_dimmer_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action dimmer_bulb_dimmable_hybrid_bulb_dimmable_dimmer_hybrid_bulb_dimmable_smart_bulb_dimmer_turn_on: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('dimmer_bulb_dimmable_hybrid_bulb_dimmable_dimmer_hybrid_bulb_dimmable_smart_bulb_dimmer_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action dimmer_bulb_dimmable_hybrid_bulb_dimmable_dimmer_hybrid_bulb_dimmable_smart_bulb_dimmer_turn_off: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('dimmer_bulb_dimmable_hybrid_bulb_dimmable_dimmer_hybrid_bulb_dimmable_smart_bulb_dimmer_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action dimmer_bulb_dimmable_hybrid_bulb_dimmable_dimmer_hybrid_bulb_dimmable_smart_bulb_dimmer_toggle: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('dimmer_bulb_dimmable_hybrid_bulb_dimmable_dimmer_hybrid_bulb_dimmable_smart_bulb_dimmer_set_dim');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action dimmer_bulb_dimmable_hybrid_bulb_dimmable_dimmer_hybrid_bulb_dimmable_smart_bulb_dimmer_set_dim: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('dimmer_bulb_dimmable_hybrid_bulb_dimmable_dimmer_hybrid_bulb_dimmable_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action dimmer_bulb_dimmable_hybrid_bulb_dimmable_dimmer_hybrid_bulb_dimmable_turn_on: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('dimmer_bulb_dimmable_hybrid_bulb_dimmable_dimmer_hybrid_bulb_dimmable_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action dimmer_bulb_dimmable_hybrid_bulb_dimmable_dimmer_hybrid_bulb_dimmable_turn_off: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('dimmer_bulb_dimmable_hybrid_bulb_dimmable_dimmer_hybrid_bulb_dimmable_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action dimmer_bulb_dimmable_hybrid_bulb_dimmable_dimmer_hybrid_bulb_dimmable_toggle: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('dimmer_bulb_dimmable_hybrid_bulb_dimmable_dimmer_hybrid_bulb_dimmable_set_brightness');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action dimmer_bulb_dimmable_hybrid_bulb_dimmable_dimmer_hybrid_bulb_dimmable_set_brightness: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = SmartBulbDimmerDriver;
