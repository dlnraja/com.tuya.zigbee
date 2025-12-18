'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');
const { WakeStrategies } = require('../../lib/tuya/TuyaGatewayEmulator');

/**
 * Motion Sensor Radar mmWave Device - v5.5.29 WAKE STRATEGIES
 *
 * Sources:
 * - Z2M: TS0601_HOBEIAN_RADAR (ZG-204ZV)
 * - Hubitat: TS0601_HOBEIAN_RADAR profile
 * - Phoscon: TS0601 presence + light sensor
 *
 * Features: presence, temperature, humidity, illuminance, battery
 * Settings: sensitivity, min/max range, fading_time, detection_delay, illuminance_interval
 *
 * Models: _TZE200_rhgsbacq, _TZE200_2aaelwxk, _TZE200_3towulqd, etc.
 */
class MotionSensorRadarDevice extends HybridSensorBase {

  // v5.5.69: These radar sensors are battery-powered (user confirmed)
  // The real fix is to call _updateLastEventTime() in ZCL handlers
  get mainsPowered() { return false; }

  // v5.5.26: Offline check timeout (60 min for mmWave - Hubitat recommendation)
  static OFFLINE_CHECK_MS = 60 * 60 * 1000;

  get sensorCapabilities() {
    return [
      'alarm_motion',
      'alarm_human',             // v5.5.170: Human presence detection
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
      // PRESENCE / MOTION (DP 1) - v5.5.170: Also sets alarm_human
      // ═══════════════════════════════════════════════════════════════════
      1: {
        capability: 'alarm_motion',
        transform: (v) => v === 1 || v === true,
        alsoSets: { 'alarm_human': (v) => v === 1 || v === true }
      },

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

      // v5.5.139: ZG-204ZM - DP106 = illuminance (NOT self_test!)
      // Source: https://github.com/Koenkk/zigbee2mqtt/issues/21919
      106: { capability: 'measure_luminance', divisor: 1 },        // ZG-204ZM illuminance (lux)

      // v5.5.26: Additional settings from Z2M HOBEIAN_RADAR profile
      107: { capability: null, setting: 'indicator' },             // LED indicator on/off
      108: { capability: null, setting: 'small_detection_distance' }, // v5.5.139: ZG-204ZM
      109: { capability: null, setting: 'small_detection_sensitivity' }, // v5.5.139: ZG-204ZM
    };
  }

  async onNodeInit({ zclNode }) {
    // v5.5.65: Remove alarm_contact if it was wrongly added (radar uses alarm_motion)
    if (this.hasCapability('alarm_contact')) {
      await this.removeCapability('alarm_contact').catch(() => { });
      this.log('[MMWAVE] ⚠️ Removed incorrect alarm_contact capability');
    }

    await super.onNodeInit({ zclNode });

    this.log('[MMWAVE] ✅ mmWave radar presence sensor ready');
    this.log('[MMWAVE] Capabilities:', this.getCapabilities().join(', '));

    // v5.5.17: Add occupancy cluster listener for radar sensors
    // Some radars use occupancySensing cluster instead of Tuya DP
    await this._setupOccupancyCluster(zclNode);

    // v5.5.17: Add IAS Zone listener for motion detection
    await this._setupIASMotionListener(zclNode);

    // v5.5.26: Setup offline check (60 min for mmWave sensors - Hubitat recommendation)
    this._lastEventTime = Date.now();
    this._setupOfflineCheck();

    // v5.5.26: Initial data query at inclusion
    this._sendInitialDataQuery();

    // v5.5.29: Setup advanced wake strategies for better data retrieval
    this._setupWakeStrategies();
  }

  /**
   * v5.5.29: Setup advanced wake strategies
   */
  async _setupWakeStrategies() {
    try {
      this.log('[MMWAVE] ⏰ Setting up wake strategies...');

      // Strategy 1: Query all DPs when ANY data is received (device is awake)
      const allDPs = [1, 2, 3, 4, 9, 10, 11, 12, 15, 101, 102, 103, 104, 105];
      await WakeStrategies.onAnyDataReceived(this, allDPs, async (dps) => {
        // When we receive any data, query everything while awake
        if (this.safeTuyaDataQuery) {
          await this.safeTuyaDataQuery(dps, {
            logPrefix: '[MMWAVE-WAKE]',
            delayBetweenQueries: 50
          });
        }
      });

      // Strategy 2: Configure ZCL attribute reporting
      await WakeStrategies.configureReporting(this).catch(() => { });

      // Strategy 3: Direct attribute reads (works better for router devices)
      await WakeStrategies.readAttributes(this).catch(() => { });

      this.log('[MMWAVE] ✅ Wake strategies configured');
    } catch (err) {
      this.log('[MMWAVE] Wake strategies error:', err.message);
    }
  }

  /**
   * v5.5.26: Setup offline check timer
   * Mark device unavailable if no event received in 60 minutes
   * Source: Hubitat TS0601_HOBEIAN_RADAR profile
   */
  _setupOfflineCheck() {
    // Clear existing timer
    if (this._offlineCheckTimer) {
      clearInterval(this._offlineCheckTimer);
    }

    // Check every 10 minutes
    this._offlineCheckTimer = setInterval(() => {
      const elapsed = Date.now() - this._lastEventTime;
      const threshold = MotionSensorRadarDevice.OFFLINE_CHECK_MS;

      if (elapsed > threshold) {
        this.log(`[MMWAVE] ⚠️ No event in ${Math.round(elapsed / 60000)} min - marking unavailable`);
        this.setUnavailable('Pas de signal depuis 60+ minutes').catch(() => { });
      } else {
        // Make sure it's available if we received data recently
        this.setAvailable().catch(() => { });
      }
    }, 10 * 60 * 1000); // Every 10 minutes

    this.log('[MMWAVE] ⏰ Offline check started (threshold: 60 min)');
  }

  /**
   * v5.5.26: Send initial data query at inclusion
   * Request all DPs while device is awake after pairing
   */
  async _sendInitialDataQuery() {
    try {
      // Small delay to let device settle after pairing
      await new Promise(resolve => setTimeout(resolve, 2000));

      this.log('[MMWAVE] 📤 Sending initial dataQuery...');
      await this._sendTuyaDataQuery?.().catch(() => { });
    } catch (err) {
      this.log('[MMWAVE] Initial dataQuery failed:', err.message);
    }
  }

  /**
   * v5.5.26: Track last event time for offline detection
   */
  _updateLastEventTime() {
    this._lastEventTime = Date.now();
    // Ensure device is marked as available when we receive data
    this.setAvailable().catch(() => { });
  }

  /**
   * v5.5.27: Refresh all DPs - called by Flow Card or manual refresh
   * Queries presence, environment, and config DPs
   */
  async refreshAll() {
    this.log('[RADAR-REFRESH] Refreshing all DPs...');

    // DPs to query based on dpMappings + Z2M research
    const DPS_PRESENCE = [1];                    // Presence (DP1)
    const DPS_ENV = [2, 3, 12, 103];             // Humidity, temp, lux
    const DPS_BATTERY = [4, 15];                 // Battery
    const DPS_CONFIG = [9, 10, 11, 101, 102, 104, 105]; // Sensitivity, range, distance, time

    const allDPs = [...DPS_PRESENCE, ...DPS_ENV, ...DPS_BATTERY, ...DPS_CONFIG];

    // Use safeTuyaDataQuery for sleepy devices
    return this.safeTuyaDataQuery(allDPs, {
      logPrefix: '[RADAR-REFRESH]',
      delayBetweenQueries: 150,
    });
  }

  /**
   * v5.5.26: Cleanup on device deletion
   */
  async onDeleted() {
    if (this._offlineCheckTimer) {
      clearInterval(this._offlineCheckTimer);
      this._offlineCheckTimer = null;
    }
    await super.onDeleted?.();
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
          this._updateLastEventTime(); // v5.5.69: Track activity
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
          this._updateLastEventTime(); // v5.5.69: Track activity
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
          this._updateLastEventTime(); // v5.5.69: Track activity
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
   * v5.5.26: Enhanced Tuya status handler with offline tracking
   * Shows both raw DP value and converted capability value
   */
  onTuyaStatus(status) {
    if (!status || status.dp === undefined) {
      super.onTuyaStatus(status);
      return;
    }

    // v5.5.26: Update last event time for offline detection
    this._updateLastEventTime();

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
