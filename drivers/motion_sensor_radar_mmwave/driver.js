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
    try { this.homey.flow.getTriggerCard('motion_sensor_radar_mmwave_presence_detected'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('motion_sensor_radar_mmwave_presence_cleared'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('motion_sensor_radar_mmwave_motion_detected'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('motion_sensor_radar_mmwave_no_motion'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('motion_sensor_radar_mmwave_illuminance_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('motion_sensor_radar_mmwave_temperature_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('motion_sensor_radar_mmwave_humidity_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('motion_sensor_radar_mmwave_target_distance_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('motion_sensor_radar_mmwave_battery_low'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('motion_sensor_radar_mmwave_battery_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('motion_sensor_radar_mmwave_distance_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('motion_sensor_radar_mmwave_temp_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('motion_sensor_radar_mmwave_lux_changed'); } catch (e) {}

    // CONDITIONS
    try {
      const card = this._getFlowCard('motion_sensor_radar_mmwave_is_presence_detected', 'condition');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error(`Condition motion_sensor_radar_mmwave_is_presence_detected: ${err.message}`); }

    try {
      const card = this._getFlowCard('motion_sensor_radar_mmwave_illuminance_above', 'condition');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
        });
      }
    } catch (err) { this.error(`Condition motion_sensor_radar_mmwave_illuminance_above: ${err.message}`); }

    try {
      const card = this._getFlowCard('motion_sensor_radar_mmwave_illuminance_below', 'condition');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition motion_sensor_radar_mmwave_illuminance_below: ${err.message}`); }

    try {
      const card = this._getFlowCard('motion_sensor_radar_mmwave_temperature_above', 'condition');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
        });
      }
    } catch (err) { this.error(`Condition motion_sensor_radar_mmwave_temperature_above: ${err.message}`); }

    try {
      const card = this._getFlowCard('motion_sensor_radar_mmwave_target_distance_less_than', 'condition');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition motion_sensor_radar_mmwave_target_distance_less_than: ${err.message}`); }

    try {
      const card = this._getFlowCard('motion_sensor_radar_mmwave_motion_active', 'condition');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition motion_sensor_radar_mmwave_motion_active: ${err.message}`); }

    // ACTIONS
    try {
      const card = this._getFlowCard('motion_sensor_radar_mmwave_set_radar_sensitivity', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action motion_sensor_radar_mmwave_set_radar_sensitivity triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action motion_sensor_radar_mmwave_set_radar_sensitivity: ${err.message}`); }

    try {
      const card = this._getFlowCard('motion_sensor_radar_mmwave_set_detection_range', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action motion_sensor_radar_mmwave_set_detection_range triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action motion_sensor_radar_mmwave_set_detection_range: ${err.message}`); }

    try {
      const card = this._getFlowCard('motion_sensor_radar_mmwave_set_fading_time', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action motion_sensor_radar_mmwave_set_fading_time triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action motion_sensor_radar_mmwave_set_fading_time: ${err.message}`); }

    try {
      const card = this._getFlowCard('motion_sensor_radar_mmwave_set_detection_delay', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action motion_sensor_radar_mmwave_set_detection_delay triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action motion_sensor_radar_mmwave_set_detection_delay: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = RadarMotionSensorMmwaveDriver;
