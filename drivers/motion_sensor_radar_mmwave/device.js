'use strict';

const { HybridSensorBase } = require('../../lib/devices');
const ZclDataMapper = require('../../lib/zigbee/zcl-data-mapper');

/**
 * Motion Sensor Radar mmWave Device - v5.3.97 UPDATED FROM Z2M
 * Source: https://www.zigbee2mqtt.io/devices/TS0601_smart_human_presence_sensor_1.html
 *
 * _TZE200_rhgsbacq and similar radar presence sensors
 */
class MotionSensorRadarDevice extends HybridSensorBase {

  // Some radar sensors are battery powered, some are mains
  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_motion', 'measure_temperature', 'measure_humidity', 'measure_luminance', 'measure_battery'];
  }

  /**
   * v5.3.97: COMPLETE DP mappings from Z2M
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // PRESENCE / MOTION (DP 1)
      // ═══════════════════════════════════════════════════════════════════
      1: { capability: 'alarm_motion', transform: (v) => v === 1 || v === true },

      // ═══════════════════════════════════════════════════════════════════
      // ENVIRONMENTAL (some radars have temp/humidity)
      // ═══════════════════════════════════════════════════════════════════
      2: { capability: 'measure_humidity' },
      3: { capability: 'measure_temperature' },

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY (DP 4, 15)
      // ═══════════════════════════════════════════════════════════════════
      4: { capability: 'measure_battery' },
      15: { capability: 'measure_battery' },

      // ═══════════════════════════════════════════════════════════════════
      // RADAR SETTINGS (from Z2M)
      // ═══════════════════════════════════════════════════════════════════
      9: { capability: null, setting: 'radar_sensitivity' },       // Sensitivity 0-9
      10: { capability: null, setting: 'minimum_range' },          // Min range (m)
      11: { capability: null, setting: 'maximum_range' },          // Max range (m)
      12: { capability: 'measure_luminance' },         // Illuminance (lux)

      // ═══════════════════════════════════════════════════════════════════
      // ADVANCED RADAR SETTINGS
      // ═══════════════════════════════════════════════════════════════════
      101: { capability: null, setting: 'presence_time' }, // Presence time (seconds)
      102: { capability: null, setting: 'target_distance' },       // Distance to target (cm)
      103: { capability: 'measure_luminance' },        // Alt illuminance
      104: { capability: null, setting: 'fading_time' },           // Fading time (s)
      105: { capability: null, setting: 'detection_delay' },       // Detection delay (s)
      106: { capability: null, setting: 'self_test' },             // Self test result
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[MMWAVE] ✅ mmWave radar presence sensor ready');
    this.log('[MMWAVE] Capabilities:', this.getCapabilities().join(', '));
  }

  _handleZCLData(cluster, attr, value) {
    if (cluster === 'temperatureMeasurement' || cluster === 'msTemperatureMeasurement') {
      const temperature = ZclDataMapper.mapTemperatureFromZcl(value);
      if (temperature !== null) {
        this.setCapabilityValue('measure_temperature', temperature);
      }
    }

    if (cluster === 'relativeHumidity' || cluster === 'msRelativeHumidity') {
      const humidity = ZclDataMapper.mapHumidityFromZcl(value);
      if (humidity !== null) {
        this.setCapabilityValue('measure_humidity', humidity);
      }
    }

    if (cluster === 'illuminanceMeasurement' || cluster === 'msIlluminanceMeasurement') {
      const luminance = ZclDataMapper.mapLuminanceFromZcl(value);
      if (luminance !== null) {
        this.setCapabilityValue('measure_luminance', luminance);
      }
    }
  }
}

module.exports = MotionSensorRadarDevice;
