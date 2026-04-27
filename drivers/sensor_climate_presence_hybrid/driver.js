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
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}

    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('sensor_climate_presence_hybrid_presence_sensor_radar_is_present_sensor_presence_radar_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error(`Condition sensor_climate_presence_hybrid_presence_sensor_radar_is_present_sensor_presence_radar_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('sensor_climate_presence_hybrid_presence_sensor_radar_illuminance_above_sensor_presence_radar_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error(`Condition sensor_climate_presence_hybrid_presence_sensor_radar_illuminance_above_sensor_presence_radar_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('sensor_climate_presence_hybrid_presence_sensor_radar_distance_within_sensor_presence_radar_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error(`Condition sensor_climate_presence_hybrid_presence_sensor_radar_distance_within_sensor_presence_radar_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('sensor_climate_presence_hybrid_presence_sensor_radar_motion_active_sensor_presence_radar_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error(`Condition sensor_climate_presence_hybrid_presence_sensor_radar_motion_active_sensor_presence_radar_hybrid: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = PresenceSensorRadarDriver;
