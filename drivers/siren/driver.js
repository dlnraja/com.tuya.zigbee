'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaSirenDriver extends ZigBeeDriver {
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
    this.log('TuyaSirenDriver v5.11.28 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}

    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('siren_is_sounding');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device || !args.device.getCapabilityValue) return false;
          return args.device.getCapabilityValue('alarm_generic') === true || args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition siren_is_sounding: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('siren_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device || !args.device.getCapabilityValue) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition siren_is_on: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('siren_motion_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device || !args.device.getCapabilityValue) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition siren_motion_active: ${err.message}`); }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('siren_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device || args.device._isInitializing) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action siren_turn_on: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('siren_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device || args.device._isInitializing) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action siren_turn_off: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('siren_set_volume');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device || args.device._isInitializing) return false;
          if (typeof args.device._sendTuyaDP === 'function') { await args.device._sendTuyaDP(5, args.volume || 1, 'enum').catch(() => {}); }
          return true;
        });
      }
    } catch (err) { this.error(`Action siren_set_volume: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('siren_set_duration');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device || args.device._isInitializing) return false;
          if (typeof args.device._sendTuyaDP === 'function') { await args.device._sendTuyaDP(7, args.duration || 30, 'value').catch(() => {}); }
          return true;
        });
      }
    } catch (err) { this.error(`Action siren_set_duration: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('siren_set_melody');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device || args.device._isInitializing) return false;
          if (typeof args.device._sendTuyaDP === 'function') { await args.device._sendTuyaDP(21, parseInt(args.melody , 10) || 0, 'enum').catch(() => {}); }
          return true;
        });
      }
    } catch (err) { this.error(`Action siren_set_melody: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('siren_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device || args.device._isInitializing || !args.device.getCapabilityValue) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action siren_toggle: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = TuyaSirenDriver;
