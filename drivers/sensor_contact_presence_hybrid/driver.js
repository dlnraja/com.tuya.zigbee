'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class PresenceSensorRadarDriver extends ZigBeeDriver {
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
    this.log('PresenceSensorRadarDriver v5.5.580 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('sensor_contact_presence_hybrid_presence_detected'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('sensor_contact_presence_hybrid_presence_cleared'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('sensor_contact_presence_hybrid_motion_detected'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('sensor_contact_presence_hybrid_illuminance_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('sensor_contact_presence_hybrid_distance_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('sensor_contact_presence_hybrid_lux_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('sensor_contact_presence_hybrid_battery_low'); } catch (e) {}

    // CONDITIONS
    try {
      const card = this._getFlowCard('sensor_contact_presence_hybrid_is_present', 'condition');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error(`Condition sensor_contact_presence_hybrid_is_present: ${err.message}`); }

    try {
      const card = this._getFlowCard('sensor_contact_presence_hybrid_illuminance_above', 'condition');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error(`Condition sensor_contact_presence_hybrid_illuminance_above: ${err.message}`); }

    try {
      const card = this._getFlowCard('sensor_contact_presence_hybrid_distance_within', 'condition');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error(`Condition sensor_contact_presence_hybrid_distance_within: ${err.message}`); }

    try {
      const card = this._getFlowCard('sensor_contact_presence_hybrid_motion_active', 'condition');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error(`Condition sensor_contact_presence_hybrid_motion_active: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = PresenceSensorRadarDriver;
