'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.583: CRITICAL FIX - Flow card run listeners were missing
 */
class RadarMotionSensorMmwaveDriver extends ZigBeeDriver {

  async onInit() {
    this.log('RadarMotionSensorMmwaveDriver v5.5.583 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Is presence detected
    try {
      this.homey.flow.getConditionCard('motion_sensor_radar_mmwave_is_presence_detected')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      this.log('[FLOW] ✅ motion_sensor_radar_mmwave_is_presence_detected');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Illuminance above
    try {
      this.homey.flow.getConditionCard('motion_sensor_radar_mmwave_illuminance_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const lux = args.device.getCapabilityValue('measure_luminance') || 0;
          return lux > (args.lux || 100);
        });
      this.log('[FLOW] ✅ motion_sensor_radar_mmwave_illuminance_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Illuminance below
    try {
      this.homey.flow.getConditionCard('motion_sensor_radar_mmwave_illuminance_below')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const lux = args.device.getCapabilityValue('measure_luminance') || 0;
          return lux < (args.lux || 100);
        });
      this.log('[FLOW] ✅ motion_sensor_radar_mmwave_illuminance_below');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Temperature above
    try {
      this.homey.flow.getConditionCard('motion_sensor_radar_mmwave_temperature_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const temp = args.device.getCapabilityValue('measure_temperature') || 0;
          return temp > (args.temp || 25);
        });
      this.log('[FLOW] ✅ motion_sensor_radar_mmwave_temperature_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Target distance less than
    try {
      this.homey.flow.getConditionCard('motion_sensor_radar_mmwave_target_distance_less_than')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const distance = args.device.getCapabilityValue('measure_distance') || 0;
          return distance < (args.distance || 3);
        });
      this.log('[FLOW] ✅ motion_sensor_radar_mmwave_target_distance_less_than');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set radar sensitivity
    try {
      this.homey.flow.getActionCard('motion_sensor_radar_mmwave_set_radar_sensitivity')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          try {
            if (args.device._tuyaEF00Manager) {
              await args.device._tuyaEF00Manager.sendDatapoint(2, args.sensitivity || 5, 'value');
            }
            return true;
          } catch (err) { return true; }
        });
      this.log('[FLOW] ✅ motion_sensor_radar_mmwave_set_radar_sensitivity');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set detection range
    try {
      this.homey.flow.getActionCard('motion_sensor_radar_mmwave_set_detection_range')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          try {
            if (args.device._tuyaEF00Manager) {
              await args.device._tuyaEF00Manager.sendDatapoint(3, Math.round((args.min || 0) * 100), 'value');
              await args.device._tuyaEF00Manager.sendDatapoint(4, Math.round((args.max || 6) * 100), 'value');
            }
            return true;
          } catch (err) { return true; }
        });
      this.log('[FLOW] ✅ motion_sensor_radar_mmwave_set_detection_range');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set fading time
    try {
      this.homey.flow.getActionCard('motion_sensor_radar_mmwave_set_fading_time')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          try {
            if (args.device._tuyaEF00Manager) {
              await args.device._tuyaEF00Manager.sendDatapoint(102, args.seconds || 30, 'value');
            }
            return true;
          } catch (err) { return true; }
        });
      this.log('[FLOW] ✅ motion_sensor_radar_mmwave_set_fading_time');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set detection delay
    try {
      this.homey.flow.getActionCard('motion_sensor_radar_mmwave_set_detection_delay')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          try {
            if (args.device._tuyaEF00Manager) {
              await args.device._tuyaEF00Manager.sendDatapoint(101, args.seconds || 0, 'value');
            }
            return true;
          } catch (err) { return true; }
        });
      this.log('[FLOW] ✅ motion_sensor_radar_mmwave_set_detection_delay');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] 🎉 mmWave radar motion sensor flow cards registered');
  }
}

module.exports = RadarMotionSensorMmwaveDriver;
