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
    const _triggerIds = ["door_controller_garage_door_controller_opened","door_controller_garage_door_controller_closed","door_controller_garage_door_controller_locked","door_controller_garage_door_controller_unlocked","door_controller_garage_door_controller_motion_detected","door_controller_garage_door_controller_contact_alarm","door_controller_garage_door_controller_battery_low","door_controller_garage_door_controller_lock_changed"];
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
      const card = this.homey.flow.getConditionCard('door_controller_garage_door_controller_is_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_contact') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition door_controller_garage_door_controller_is_open: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('door_controller_garage_door_controller_is_locked');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition door_controller_garage_door_controller_is_locked: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('door_controller_garage_door_controller_motion_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition door_controller_garage_door_controller_motion_active: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('door_controller_garage_door_controller_contact_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition door_controller_garage_door_controller_contact_open: ${err.message}`); }; }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('door_controller_garage_door_controller_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action door_controller_garage_door_controller_open triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action door_controller_garage_door_controller_open: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('door_controller_garage_door_controller_close');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action door_controller_garage_door_controller_close triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action door_controller_garage_door_controller_close: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('door_controller_garage_door_controller_lock');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action door_controller_garage_door_controller_lock triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action door_controller_garage_door_controller_lock: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('door_controller_garage_door_controller_unlock');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action door_controller_garage_door_controller_unlock triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action door_controller_garage_door_controller_unlock: ${err.message}`); }; }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = DoorControllerDriver;

