'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LedStripDriver extends ZigBeeDriver {
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
    this.log('LedStripDriver v5.5.574 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    const _triggerIds = ["device_air_purifier_led_led_strip_led_strip_turned_on","device_air_purifier_led_led_strip_led_strip_turned_off","device_air_purifier_led_led_strip_turned_on","device_air_purifier_led_led_strip_turned_off","device_air_purifier_led_led_strip_battery_low"];
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
      const card = this.homey.flow.getConditionCard('device_air_purifier_led_led_strip_led_strip_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition device_air_purifier_led_led_strip_led_strip_is_on: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('device_air_purifier_led_led_strip_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition device_air_purifier_led_led_strip_is_on: ${err.message}`); }; }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('device_air_purifier_led_led_strip_led_strip_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_air_purifier_led_led_strip_led_strip_turn_on: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('device_air_purifier_led_led_strip_led_strip_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_air_purifier_led_led_strip_led_strip_turn_off: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('device_air_purifier_led_led_strip_led_strip_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_air_purifier_led_led_strip_led_strip_toggle: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('device_air_purifier_led_led_strip_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_air_purifier_led_led_strip_turn_on: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('device_air_purifier_led_led_strip_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_air_purifier_led_led_strip_turn_off: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('device_air_purifier_led_led_strip_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_air_purifier_led_led_strip_toggle: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('device_air_purifier_led_led_strip_set_brightness');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action device_air_purifier_led_led_strip_set_brightness: ${err.message}`); }; }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = LedStripDriver;

