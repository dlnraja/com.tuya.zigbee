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
    // TRIGGERS (handled by compose)

    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('sensor_motion_radar_motion_sensor_radar_mmwave_is_presence_detected');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error('[FLOW] Condition is_presence_detected:', err.message); }

    try {
      const card = this.homey.flow.getConditionCard('sensor_motion_radar_motion_sensor_radar_mmwave_illuminance_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const val = args.device.getCapabilityValue('measure_luminance') || 0;
          return val > (args.threshold || 400);
        });
      }
    } catch (err) { this.error('[FLOW] Condition illuminance_above:', err.message); }

    try {
      const card = this.homey.flow.getConditionCard('sensor_motion_radar_motion_sensor_radar_mmwave_illuminance_below');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const val = args.device.getCapabilityValue('measure_luminance') || 0;
          return val < (args.threshold || 400);
        });
      }
    } catch (err) { this.error('[FLOW] Condition illuminance_below:', err.message); }

    try {
      const card = this.homey.flow.getConditionCard('sensor_motion_radar_motion_sensor_radar_mmwave_temperature_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const val = args.device.getCapabilityValue('measure_temperature') || 0;
          return val > (args.threshold || 25);
        });
      }
    } catch (err) { this.error('[FLOW] Condition temperature_above:', err.message); }

    try {
      const card = this.homey.flow.getConditionCard('sensor_motion_radar_motion_sensor_radar_mmwave_target_distance_less_than');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const val = args.device.getCapabilityValue('measure_distance') || 0;
          return val < (args.distance || 3);
        });
      }
    } catch (err) { this.error('[FLOW] Condition target_distance_less_than:', err.message); }

    try {
      const card = this.homey.flow.getConditionCard('sensor_motion_radar_motion_sensor_radar_mmwave_motion_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error('[FLOW] Condition motion_active:', err.message); }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('sensor_motion_radar_motion_sensor_radar_mmwave_set_radar_sensitivity');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          this.log('[FLOW] Action set_radar_sensitivity triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error('[FLOW] Action set_radar_sensitivity:', err.message); }

    try {
      const card = this.homey.flow.getActionCard('sensor_motion_radar_motion_sensor_radar_mmwave_set_detection_range');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          this.log('[FLOW] Action set_detection_range triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error('[FLOW] Action set_detection_range:', err.message); }

    try {
      const card = this.homey.flow.getActionCard('sensor_motion_radar_motion_sensor_radar_mmwave_set_fading_time');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          this.log('[FLOW] Action set_fading_time triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error('[FLOW] Action set_fading_time:', err.message); }

    try {
      const card = this.homey.flow.getActionCard('sensor_motion_radar_motion_sensor_radar_mmwave_set_detection_delay');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          this.log('[FLOW] Action set_detection_delay triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error('[FLOW] Action set_detection_delay:', err.message); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = RadarMotionSensorMmwaveDriver;
