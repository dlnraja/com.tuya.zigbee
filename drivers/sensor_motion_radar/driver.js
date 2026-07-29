'use strict';

const { safeMultiply } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDriver } = require('homey-zigbeedriver');

class RadarMotionSensorMmwaveDriver extends ZigBeeDriver {
async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('RadarMotionSensorMmwaveDriver v5.5.583 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS

    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('sensor_motion_radar_motion_sensor_radar_mmwa_8df59');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error('[FLOW] Condition is_presence_detected:', err.message); }

    try {
      const card = this.homey.flow.getConditionCard('sensor_motion_radar_motion_sensor_radar_mmwa_9b14f');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition sensor_motion_radar_motion_sensor_radar_mmwa_9b14f: ${err.message}`); } }

    try {
      const card = this.homey.flow.getConditionCard('sensor_motion_radar_motion_sensor_radar_mmwa_bb5c6');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition sensor_motion_radar_motion_sensor_radar_mmwa_bb5c6: ${err.message}`); } }

    try {
      const card = this.homey.flow.getConditionCard('sensor_motion_radar_motion_sensor_radar_mmwa_07985');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition sensor_motion_radar_motion_sensor_radar_mmwa_07985: ${err.message}`); } }

    try {
      const card = this.homey.flow.getConditionCard('sensor_motion_radar_motion_sensor_radar_mmwave_target_distance_l_9897d');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition sensor_motion_radar_motion_sensor_radar_mmwave_target_distance_l_9897d: ${err.message}`); } }

    try {
      const card = this.homey.flow.getConditionCard('sensor_motion_radar_motion_sensor_radar_mmwa_251e3');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition sensor_motion_radar_motion_sensor_radar_mmwa_251e3: ${err.message}`); } }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('sensor_motion_radar_motion_sensor_radar_mmwa_5a241');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          // Generic action handler
          this.log('[FLOW] Action sensor_motion_radar_motion_sensor_radar_mmwa_5a241 triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action sensor_motion_radar_motion_sensor_radar_mmwa_5a241: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('sensor_motion_radar_motion_sensor_radar_mmwa_3c566');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          // Generic action handler
          this.log('[FLOW] Action sensor_motion_radar_motion_sensor_radar_mmwa_3c566 triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action sensor_motion_radar_motion_sensor_radar_mmwa_3c566: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('sensor_motion_radar_motion_sensor_radar_mmwa_daf4c');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          // Generic action handler
          this.log('[FLOW] Action sensor_motion_radar_motion_sensor_radar_mmwa_daf4c triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action sensor_motion_radar_motion_sensor_radar_mmwa_daf4c: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('sensor_motion_radar_motion_sensor_radar_mmwa_ac105');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          // Generic action handler
          this.log('[FLOW] Action sensor_motion_radar_motion_sensor_radar_mmwa_ac105 triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action sensor_motion_radar_motion_sensor_radar_mmwa_ac105: ${err.message}`); } }

    this.log('[FLOW] All flow cards registered');
    }
}
module.exports = RadarMotionSensorMmwaveDriver;
