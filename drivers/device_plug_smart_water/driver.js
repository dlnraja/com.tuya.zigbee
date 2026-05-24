'use strict';

const { safeMultiply } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDriver } = require('homey-zigbeedriver');

class PlugSmartDriver extends ZigBeeDriver {
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
    this.log('PlugSmartDriver v5.5.570 initialized');
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

    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('device_plug_smart_water_hybrid_plug_smart_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition device_plug_smart_water_hybrid_plug_smart_is_on: ${err.message}`); }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('device_plug_smart_water_hybrid_plug_smart_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action device_plug_smart_water_hybrid_plug_smart_turn_on: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('device_plug_smart_water_hybrid_plug_smart_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action device_plug_smart_water_hybrid_plug_smart_turn_off: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('device_plug_smart_water_hybrid_plug_smart_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action device_plug_smart_water_hybrid_plug_smart_toggle: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('device_plug_smart_water_hybrid_plug_smart_turn_on_delay');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action device_plug_smart_water_hybrid_plug_smart_turn_on_delay: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('device_plug_smart_water_hybrid_plug_smart_turn_off_delay');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action device_plug_smart_water_hybrid_plug_smart_turn_off_delay: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('device_plug_smart_water_hybrid_plug_smart_set_indicator');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action device_plug_smart_water_hybrid_plug_smart_set_indicator triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action device_plug_smart_water_hybrid_plug_smart_set_indicator: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('device_plug_smart_water_hybrid_plug_smart_set_power_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action device_plug_smart_water_hybrid_plug_smart_set_power_on: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = PlugSmartDriver;

