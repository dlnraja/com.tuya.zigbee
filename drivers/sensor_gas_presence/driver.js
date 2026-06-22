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
    const _triggerIds = ["sensor_gas_presence_presence_sensor_radar_presence_detected","sensor_gas_presence_presence_sensor_radar_presence_cleared","sensor_gas_presence_presence_sensor_radar_motion_detected","sensor_gas_presence_presence_sensor_radar_illuminance_changed","sensor_gas_presence_presence_sensor_radar_distance_changed","sensor_gas_presence_presence_sensor_radar_lux_changed","sensor_gas_presence_presence_sensor_radar_battery_low"];
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
      const card = this.homey.flow.getConditionCard('sensor_gas_presence_presence_sensor_radar_is_present');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition sensor_gas_presence_presence_sensor_radar_is_present: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('sensor_gas_presence_presence_sensor_radar_illuminance_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition sensor_gas_presence_presence_sensor_radar_illuminance_above: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('sensor_gas_presence_presence_sensor_radar_distance_within');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition sensor_gas_presence_presence_sensor_radar_distance_within: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('sensor_gas_presence_presence_sensor_radar_motion_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition sensor_gas_presence_presence_sensor_radar_motion_active: ${err.message}`); }; }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = PresenceSensorRadarDriver;

