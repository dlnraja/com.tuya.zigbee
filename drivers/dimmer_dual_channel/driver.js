'use strict';

const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDriver } = require('homey-zigbeedriver');

class DimmerDualChannelDriver extends ZigBeeDriver {
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
    this.log('DimmerDualChannelDriver v5.5.578 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}

    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('dimmer_dual_channel_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition dimmer_dual_channel_is_on: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('dimmer_dual_channel_dim_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { this.error(`Condition dimmer_dual_channel_dim_above: ${err.message}`); }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('dimmer_dual_channel_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action dimmer_dual_channel_turn_on: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('dimmer_dual_channel_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action dimmer_dual_channel_turn_off: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('dimmer_dual_channel_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action dimmer_dual_channel_toggle: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('dimmer_dual_channel_set_dim');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action dimmer_dual_channel_set_dim: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('dimmer_dual_channel_dim_up');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action dimmer_dual_channel_dim_up triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action dimmer_dual_channel_dim_up: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('dimmer_dual_channel_dim_down');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action dimmer_dual_channel_dim_down triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action dimmer_dual_channel_dim_down: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('dimmer_dual_channel_set_brightness');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action dimmer_dual_channel_set_brightness: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = DimmerDualChannelDriver;
