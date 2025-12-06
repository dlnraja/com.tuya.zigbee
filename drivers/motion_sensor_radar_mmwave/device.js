'use strict';

const { HybridSensorBase } = require('../../lib/devices');

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
      2: { capability: 'measure_humidity', divisor: 1 },
      3: { capability: 'measure_temperature', divisor: 10 },

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY (DP 4, 15)
      // ═══════════════════════════════════════════════════════════════════
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // RADAR SETTINGS (from Z2M)
      // ═══════════════════════════════════════════════════════════════════
      9: { capability: null, setting: 'radar_sensitivity' },       // Sensitivity 0-9
      10: { capability: null, setting: 'minimum_range' },          // Min range (m)
      11: { capability: null, setting: 'maximum_range' },          // Max range (m)
      12: { capability: 'measure_luminance', divisor: 1 },         // Illuminance (lux)

      // ═══════════════════════════════════════════════════════════════════
      // ADVANCED RADAR SETTINGS
      // v5.4.3: DP101 FIX - presence_time is TIME in seconds, NOT boolean!
      // Forum: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/290
      // ═══════════════════════════════════════════════════════════════════
      101: { capability: null, setting: 'presence_time' },         // Presence time (seconds)
      102: { capability: null, setting: 'target_distance' },       // Distance to target (cm)
      103: { capability: 'measure_luminance', divisor: 1 },        // Alt illuminance
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

  /**
   * v5.5.5: Enhanced logging per MASTER BLOCK specs
   * Shows both raw DP value and converted capability value
   */
  onTuyaStatus(status) {
    if (!status || status.dp === undefined) {
      super.onTuyaStatus(status);
      return;
    }

    const rawValue = status.data || status.value;

    // v5.5.5: Log raw + converted values per MASTER BLOCK specs
    switch (status.dp) {
      case 1: // Presence/motion
        this.log(`[ZCL-DATA] mmwave.motion raw=${rawValue} converted=${rawValue === 1 || rawValue === true}`);
        break;
      case 2: // Humidity
        this.log(`[ZCL-DATA] mmwave.humidity raw=${rawValue} converted=${rawValue}`);
        break;
      case 3: // Temperature
        this.log(`[ZCL-DATA] mmwave.temperature raw=${rawValue} converted=${rawValue / 10}`);
        break;
      case 12:
      case 103: // Illuminance
        this.log(`[ZCL-DATA] mmwave.luminance raw=${rawValue} converted=${rawValue} lux`);
        break;
      case 4:
      case 15: // Battery
        this.log(`[ZCL-DATA] mmwave.battery raw=${rawValue} converted=${rawValue}%`);
        break;
      default:
        this.log(`[ZCL-DATA] mmwave.unknown_dp dp=${status.dp} raw=${rawValue}`);
    }

    // Call parent handler
    super.onTuyaStatus(status);
  }
}

module.exports = MotionSensorRadarDevice;
