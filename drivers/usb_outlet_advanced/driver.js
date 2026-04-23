'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class UsbOutletAdvancedDriver extends ZigBeeDriver {
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
    this.log('UsbOutletAdvancedDriver v5.5.575 initializing...');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('usb_outlet_advanced_usb_outlet_button_pressed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('usb_outlet_advanced_turned_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('usb_outlet_advanced_turned_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('usb_outlet_advanced_measure_power_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('usb_outlet_advanced_measure_voltage_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('usb_outlet_advanced_measure_current_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('usb_outlet_advanced_meter_power_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('usb_outlet_advanced_power_changed'); } catch (e) {}

    // CONDITIONS
    try {
      const card = const card = this.homey.flow.getConditionCard('usb_outlet_advanced_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition usb_outlet_advanced_is_on: ${err.message}`); }

    // ACTIONS
    try {
      const card = const card = this.homey.flow.getActionCard('usb_outlet_advanced_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action usb_outlet_advanced_turn_on: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('usb_outlet_advanced_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action usb_outlet_advanced_turn_off: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('usb_outlet_advanced_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action usb_outlet_advanced_toggle: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = UsbOutletAdvancedDriver;
