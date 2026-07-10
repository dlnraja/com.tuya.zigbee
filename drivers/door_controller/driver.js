'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class DoorControllerDriver extends ZigBeeDriver {
async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('DoorControllerDriver v5.5.575 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('door_controller_is_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('alarm_contact') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition door_controller_is_open: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('door_controller_is_locked');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition door_controller_is_locked: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('door_controller_motion_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition door_controller_motion_active: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('door_controller_contact_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition door_controller_contact_open: ${err.message}`); }; }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('door_controller_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          this.log('[FLOW] Action door_controller_open triggered for', args.device.getName());
          // Send Tuya DP command: DP1 enum value 0 = open
          if (args.device.tuyaEF00Manager) {
            await args.device.tuyaEF00Manager.sendDP(1, 0, 'enum');
          } else if (args.device._sendTuyaDP) {
            await args.device._sendTuyaDP(1, 0, 'enum');
          }
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action door_controller_open: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('door_controller_close');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          this.log('[FLOW] Action door_controller_close triggered for', args.device.getName());
          // Send Tuya DP command: DP1 enum value 2 = close
          if (args.device.tuyaEF00Manager) {
            await args.device.tuyaEF00Manager.sendDP(1, 2, 'enum');
          } else if (args.device._sendTuyaDP) {
            await args.device._sendTuyaDP(1, 2, 'enum');
          }
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action door_controller_close: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('door_controller_lock');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          this.log('[FLOW] Action door_controller_lock triggered for', args.device.getName());
          // Send Tuya DP command: DP1 bool true = lock
          if (args.device.tuyaEF00Manager) {
            await args.device.tuyaEF00Manager.sendDP(1, true, 'bool');
          } else if (args.device._sendTuyaDP) {
            await args.device._sendTuyaDP(1, true, 'bool');
          }
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action door_controller_lock: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('door_controller_unlock');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          this.log('[FLOW] Action door_controller_unlock triggered for', args.device.getName());
          // Send Tuya DP command: DP1 bool false = unlock
          if (args.device.tuyaEF00Manager) {
            await args.device.tuyaEF00Manager.sendDP(1, false, 'bool');
          } else if (args.device._sendTuyaDP) {
            await args.device._sendTuyaDP(1, false, 'bool');
          }
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action door_controller_unlock: ${err.message}`); }; }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = DoorControllerDriver;
