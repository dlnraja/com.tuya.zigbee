'use strict';

const { safeMultiply } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDriver } = require('homey-zigbeedriver');

class RadarMotionSensorMmwaveDriver extends ZigBeeDriver {
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
    this.log('RadarMotionSensorMmwaveDriver v5.5.583 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS

    // CONDITIONS
    try {
      // A8: NaN Safety - use safeDivide/safeMultiply
      const card = null;
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error(`Condition air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_is_presence_detected_sensor_motion_radar_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_illuminance_above_sensor_motion_radar_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { this.error(`Condition air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_illuminance_above_sensor_motion_radar_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_illuminance_below_sensor_motion_radar_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_illuminance_below_sensor_motion_radar_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_temperature_above_sensor_motion_radar_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { this.error(`Condition air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_temperature_above_sensor_motion_radar_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_target_distance_less_than_sensor_motion_radar_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_target_distance_less_than_sensor_motion_radar_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_motion_active_sensor_motion_radar_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_motion_active_sensor_motion_radar_hybrid: ${err.message}`); }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_set_radar_sensitivity_sensor_motion_radar_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_set_radar_sensitivity_sensor_motion_radar_hybrid triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_set_radar_sensitivity_sensor_motion_radar_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_set_detection_range_sensor_motion_radar_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_set_detection_range_sensor_motion_radar_hybrid triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_set_detection_range_sensor_motion_radar_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_set_fading_time_sensor_motion_radar_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_set_fading_time_sensor_motion_radar_hybrid triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_set_fading_time_sensor_motion_radar_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_set_detection_delay_sensor_motion_radar_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_set_detection_delay_sensor_motion_radar_hybrid triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action air_purifier_sensor_hybrid_motion_sensor_radar_mmwave_set_detection_delay_sensor_motion_radar_hybrid: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
    }
}
module.exports = RadarMotionSensorMmwaveDriver;
