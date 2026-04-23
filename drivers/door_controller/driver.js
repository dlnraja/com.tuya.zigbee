'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class DoorControllerDriver extends ZigBeeDriver {
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
    this.log('DoorControllerDriver v5.5.575 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('door_controller_opened'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('door_controller_closed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('door_controller_locked'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('door_controller_unlocked'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('door_controller_motion_detected'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('door_controller_contact_alarm'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('door_controller_battery_low'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('door_controller_lock_changed'); } catch (e) {}

    // CONDITIONS
    try {
      const card = const card = this.homey.flow.getConditionCard('door_controller_is_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_contact') === true;
        });
      }
    } catch (err) { this.error(`Condition door_controller_is_open: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('door_controller_is_locked');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition door_controller_is_locked: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('door_controller_motion_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition door_controller_motion_active: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('door_controller_contact_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition door_controller_contact_open: ${err.message}`); }

    // ACTIONS
    try {
      const card = const card = this.homey.flow.getActionCard('door_controller_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action door_controller_open triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action door_controller_open: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('door_controller_close');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action door_controller_close triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action door_controller_close: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('door_controller_lock');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action door_controller_lock triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action door_controller_lock: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('door_controller_unlock');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action door_controller_unlock triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action door_controller_unlock: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = DoorControllerDriver;
