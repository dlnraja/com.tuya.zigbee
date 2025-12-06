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
    return [
      'alarm_motion',
      'measure_distance',        // v5.5.17: Distance to target (cm)
      'measure_presence_time',   // v5.5.17: Presence duration (s)
      'measure_temperature',
      'measure_humidity',
      'measure_luminance',
      'measure_battery'
    ];
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
      // v5.5.17: presence_time > 0 means someone IS present!
      // Forum: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/290
      // ═══════════════════════════════════════════════════════════════════
      // v5.5.17: DP101 = presence_time in seconds
      // - Updates measure_presence_time capability
      // - Also sets alarm_motion = true if > 0
      101: {
        capability: 'measure_presence_time',
        divisor: 1,
        alsoSetsMotion: true  // Custom flag for intelligent detection
      },
      // v5.5.17: DP102 = distance to target in cm
      102: {
        capability: 'measure_distance',
        divisor: 1
      },
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

    // v5.5.17: Add occupancy cluster listener for radar sensors
    // Some radars use occupancySensing cluster instead of Tuya DP
    await this._setupOccupancyCluster(zclNode);

    // v5.5.17: Add IAS Zone listener for motion detection
    await this._setupIASMotionListener(zclNode);
  }

  /**
   * v5.5.17: Setup occupancy sensing cluster listener
   * For mmWave radar sensors that use standard ZCL
   */
  async _setupOccupancyCluster(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      if (!endpoint?.clusters) return;

      const occCluster = endpoint.clusters.occupancySensing
        || endpoint.clusters.msOccupancySensing
        || endpoint.clusters['1030']
        || endpoint.clusters[0x0406];

      if (occCluster) {
        this.log('[MMWAVE] ✅ OccupancySensing cluster found - setting up listener');

        occCluster.on('attr.occupancy', (value) => {
          const motion = value > 0;
          this.log(`[ZCL-DATA] mmwave.occupancy raw=${value} converted=${motion}`);
          if (this.hasCapability('alarm_motion')) {
            this.setCapabilityValue('alarm_motion', motion).catch(this.error);
          }
        });

        // Try initial read
        try {
          const attrs = await occCluster.readAttributes(['occupancy']);
          if (attrs?.occupancy !== undefined) {
            const motion = attrs.occupancy > 0;
            this.log(`[MMWAVE] Initial occupancy: ${motion}`);
            if (this.hasCapability('alarm_motion')) {
              this.setCapabilityValue('alarm_motion', motion).catch(this.error);
            }
          }
        } catch (e) {
          this.log('[MMWAVE] Initial occupancy read failed (device sleeping?)');
        }
      }
    } catch (err) {
      this.log('[MMWAVE] OccupancySensing setup error:', err.message);
    }
  }

  /**
   * v5.5.17: Setup IAS Zone listener for motion
   */
  async _setupIASMotionListener(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      const iasCluster = endpoint?.clusters?.iasZone || endpoint?.clusters?.ssIasZone;

      if (iasCluster) {
        this.log('[MMWAVE] ✅ IAS Zone cluster found - setting up motion listener');

        iasCluster.onZoneStatusChangeNotification = (payload) => {
          // v5.5.17: Use universal parser from HybridSensorBase
          const parsed = this._parseIASZoneStatus(payload?.zoneStatus);
          const motion = parsed.alarm1 || parsed.alarm2;

          this.log(`[ZCL-DATA] mmwave.ias_zone raw=${parsed.raw} alarm1=${parsed.alarm1} alarm2=${parsed.alarm2} → motion=${motion}`);

          if (this.hasCapability('alarm_motion')) {
            this.setCapabilityValue('alarm_motion', motion).catch(this.error);
          }
        };

        // Trigger flow on zone status change
        iasCluster.on('attr.zoneStatus', (status) => {
          const motion = (status & 0x01) !== 0 || (status & 0x02) !== 0;
          this.log(`[ZCL-DATA] mmwave.zone_status raw=${status} converted=${motion}`);

          if (this.hasCapability('alarm_motion')) {
            this.setCapabilityValue('alarm_motion', motion).catch(this.error);
          }
        });
      }
    } catch (err) {
      this.log('[MMWAVE] IAS Zone setup error:', err.message);
    }
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
      case 1: // Presence/motion (boolean 0/1)
        this.log(`[ZCL-DATA] mmwave.presence_dp1 raw=${rawValue} → alarm_motion=${rawValue === 1 || rawValue === true}`);
        break;
      case 101: // Presence time (seconds)
        this.log(`[ZCL-DATA] mmwave.presence_time raw=${rawValue}s → measure_presence_time=${rawValue}, alarm_motion=${rawValue > 0}`);
        // v5.5.17: Intelligent presence - if presence_time > 0, someone IS present
        if (rawValue > 0 && this.hasCapability('alarm_motion')) {
          this.setCapabilityValue('alarm_motion', true).catch(this.error);
        }
        break;
      case 102: // Distance to target (cm)
        this.log(`[ZCL-DATA] mmwave.distance raw=${rawValue}cm → measure_distance=${rawValue}`);
        // v5.5.17: If distance reported, someone is detected
        if (rawValue > 0 && this.hasCapability('alarm_motion')) {
          this.setCapabilityValue('alarm_motion', true).catch(this.error);
        }
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
