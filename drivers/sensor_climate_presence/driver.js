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
    const _triggerIds = ["sensor_climate_presence_sensor_presence_radar_presence_detected","sensor_climate_presence_sensor_presence_radar_presence_cleared","sensor_climate_presence_presence_sensor_radar_motion_detected_sensor_presence_radar","sensor_climate_presence_presence_sensor_radar_illuminance_changed_sensor_presence_radar","sensor_climate_presence_presence_sensor_radar_distance_changed_sensor_presence_radar","sensor_climate_presence_presence_sensor_radar_lux_changed_sensor_presence_radar","sensor_climate_presence_presence_sensor_radar_battery_low_sensor_presence_radar"];
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
      const card = this.homey.flow.getConditionCard('sensor_climate_presence_presence_sensor_radar_is_present_sensor_presence_radar');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error(`Condition sensor_climate_presence_presence_sensor_radar_is_present_sensor_presence_radar: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('sensor_climate_presence_presence_sensor_radar_illuminance_above_sensor_presence_radar');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error(`Condition sensor_climate_presence_presence_sensor_radar_illuminance_above_sensor_presence_radar: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('sensor_climate_presence_presence_sensor_radar_distance_within_sensor_presence_radar');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error(`Condition sensor_climate_presence_presence_sensor_radar_distance_within_sensor_presence_radar: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('sensor_climate_presence_presence_sensor_radar_motion_active_sensor_presence_radar');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error(`Condition sensor_climate_presence_presence_sensor_radar_motion_active_sensor_presence_radar: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = PresenceSensorRadarDriver;

