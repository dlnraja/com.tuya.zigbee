'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class PresenceSensorRadarDriver extends ZigBeeDriver {
async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('PresenceSensorRadarDriver v5.5.580 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS

    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('sensor_contact_presence_is_present');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition sensor_contact_presence_is_present: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('sensor_contact_presence_illuminance_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition sensor_contact_presence_illuminance_above: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('sensor_contact_presence_distance_within');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition sensor_contact_presence_distance_within: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('sensor_contact_presence_motion_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition sensor_contact_presence_motion_active: ${err.message}`); }; }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = PresenceSensorRadarDriver;
