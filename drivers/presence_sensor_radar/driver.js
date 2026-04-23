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
    await super// Sleepy device: Use Passive Mode (SLEEPY_TUYA_56_YEARS_BUG.md)
    .onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('PresenceSensorRadarDriver v5.5.580 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('presence_sensor_radar_presence_detected'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('presence_sensor_radar_presence_cleared'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('presence_sensor_radar_motion_detected'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('presence_sensor_radar_illuminance_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('presence_sensor_radar_distance_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('presence_sensor_radar_lux_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('presence_sensor_radar_battery_low'); } catch (e) {}

    // CONDITIONS
    try {
      const card = const card = this.homey.flow.getConditionCard('presence_sensor_radar_is_present');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error(`Condition presence_sensor_radar_is_present: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('presence_sensor_radar_illuminance_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error(`Condition presence_sensor_radar_illuminance_above: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('presence_sensor_radar_distance_within');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error(`Condition presence_sensor_radar_distance_within: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('presence_sensor_radar_motion_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error(`Condition presence_sensor_radar_motion_active: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = PresenceSensorRadarDriver;
