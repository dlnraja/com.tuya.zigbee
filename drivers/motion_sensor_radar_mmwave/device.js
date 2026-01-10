'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');
const { WakeStrategies } = require('../../lib/tuya/TuyaGatewayEmulator');

/**
 * Motion Sensor Radar mmWave Device - v5.5.275 MODEL-SPECIFIC CONFIGS
 *
 * Sources:
 * - Z2M: TS0601_HOBEIAN_RADAR (ZG-204ZV)
 * - Hubitat: TS0601_HOBEIAN_RADAR profile
 * - Phoscon: TS0601 presence + light sensor
 *
 * v5.5.275: Added model-specific configs to prevent NULL capabilities
 * - SIMPLE models: Only basic presence (DP1) + illuminance (DP12)
 * - ADVANCED models: Full capabilities (DP101/102 for distance/time)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL-SPECIFIC CONFIGURATIONS
// v5.5.275: Fix for dlnraja's _TZE200_rhgsbacq showing NULL capabilities
// ═══════════════════════════════════════════════════════════════════════════════
const MODEL_CONFIGS = {
  // SIMPLE radars - basic presence only (no distance/time)
  SIMPLE: {
    models: [
      '_TZE200_rhgsbacq', '_TZE200_kb5noeto', '_TZE200_5b5noeto',
      '_TZE200_bh3n6gk8', '_TZE200_1ibpyhdc', '_TZE200_ttcovulf',
      '_TZE200_sgpeacqp', '_TZE200_holel4dk',
    ],
    capabilities: ['alarm_motion', 'measure_luminance', 'measure_battery'],
    dps: [1, 4, 12, 15],  // Only query these DPs
  },
  // ADVANCED radars - full features
  ADVANCED: {
    models: [
      '_TZE200_2aaelwxk', '_TZE200_3towulqd', '_TZE204_e5m9c5hl',
      '_TZE204_ijxvkhd0', '_TZE204_qasjif9e', '_TZE204_sxm7l9xa',
      '_TZE284_4qznlkbu', '_TZE284_fwondbzy',
    ],
    capabilities: ['alarm_motion', 'alarm_human', 'measure_distance', 'measure_presence_time', 'measure_luminance', 'measure_battery'],
    dps: [1, 2, 3, 4, 9, 10, 11, 12, 15, 101, 102, 103, 104, 105],
  },
};

function getModelConfig(manufacturerName) {
  for (const [type, config] of Object.entries(MODEL_CONFIGS)) {
    if (config.models.includes(manufacturerName)) {
      return { type, ...config };
    }
  }
  // Default to ADVANCED for unknown models
  return { type: 'ADVANCED', ...MODEL_CONFIGS.ADVANCED };
}
class MotionSensorRadarDevice extends HybridSensorBase {

  // v5.5.69: These radar sensors are battery-powered (user confirmed)
  get mainsPowered() { return false; }

  // v5.5.26: Offline check timeout (60 min for mmWave - Hubitat recommendation)
  static OFFLINE_CHECK_MS = 60 * 60 * 1000;

  /**
   * v5.5.275: Get model-specific configuration
   */
  _getModelConfig() {
    if (!this._modelConfig) {
      const mfr = this.getData()?.manufacturerName || '';
      this._modelConfig = getModelConfig(mfr);
      this.log(`[MMWAVE] 🧠 Model config: ${this._modelConfig.type} for ${mfr}`);
    }
    return this._modelConfig;
  }

  /**
   * v5.5.275: Model-specific capabilities
   * SIMPLE models only get basic presence + illuminance
   * ADVANCED models get full distance/time features
   */
  get sensorCapabilities() {
    const config = this._getModelConfig();
    return config.capabilities;
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

    // v5.5.295: FORUM FIX - Continuous luminance updates
    // Based on research from 10+ sources: Z2M, ZHA, HA Community, etc.
    await this._setupContinuousLuminanceReporting(zclNode);

    // v5.5.26: Initial data query at inclusion
    this._sendInitialDataQuery();

    // v5.5.29: Setup advanced wake strategies for better data retrieval
    this._setupWakeStrategies();
  }

  /**
   * v5.5.295: FORUM FIX - Setup continuous luminance reporting
   * Based on research from 10+ sources: Zigbee2MQTT, ZHA, HA Community, etc.
   *
   * CRITICAL FINDINGS:
   * - Illuminance cluster (0x0400) should report independently from motion
   * - Configure reporting intervals: min=30s, max=300s, change=50lux
   * - Motion sensors tie luminance to motion detection - this fixes it
   */
  async _setupContinuousLuminanceReporting(zclNode) {
    if (!this.hasCapability('measure_luminance')) {
      this.log('[LUMINANCE-FIX] ⚠️ No measure_luminance capability - skipping');
      return;
    }

    this.log('[LUMINANCE-FIX] 🌞 Setting up continuous luminance reporting...');
    this.log('[LUMINANCE-FIX] Research base: Z2M ZG-204ZL, Tuya docs, HA Community, ZHA, etc.');

    try {
      const endpoint = zclNode?.endpoints?.[1];
      if (!endpoint) {
        this.log('[LUMINANCE-FIX] ⚠️ No endpoint 1 found');
        return;
      }

      // Try to find illuminance measurement cluster (0x0400)
      const illuminanceCluster = endpoint.clusters?.illuminanceMeasurement
        || endpoint.clusters?.msIlluminanceMeasurement
        || endpoint.clusters?.[0x0400]
        || endpoint.clusters?.['1024'];

      if (illuminanceCluster) {
        this.log('[LUMINANCE-FIX] ✅ Illuminance cluster found - configuring reporting');

        try {
          // Configure autonomous reporting (independent from motion)
          await illuminanceCluster.configureReporting({
            measuredValue: {
              minInterval: 30,      // 30 seconds minimum
              maxInterval: 300,     // 5 minutes maximum
              minChange: 50         // 50 lux minimum change
            }
          });

          this.log('[LUMINANCE-FIX] ✅ Illuminance reporting configured: 30s-300s, Δ50lux');

          // Setup attribute listener for continuous updates
          illuminanceCluster.on('attr.measuredValue', async (value) => {
            if (value !== null && value !== undefined && value >= 0) {
              this.log(`[LUMINANCE-FIX] 🌞 Continuous luminance update: ${value} lux`);
              await this.setCapabilityValue('measure_luminance', parseFloat(value)).catch(() => { });
            }
          });

          // Try initial read
          try {
            const initialValue = await illuminanceCluster.readAttributes(['measuredValue']);
            if (initialValue?.measuredValue !== undefined && initialValue.measuredValue >= 0) {
              this.log(`[LUMINANCE-FIX] 📖 Initial luminance: ${initialValue.measuredValue} lux`);
              await this.setCapabilityValue('measure_luminance', parseFloat(initialValue.measuredValue)).catch(() => { });
            }
          } catch (e) {
            this.log('[LUMINANCE-FIX] ⚠️ Initial read failed (normal for sleepy devices)');
          }

        } catch (configError) {
          this.log('[LUMINANCE-FIX] ⚠️ Configure reporting failed:', configError.message);
          this.log('[LUMINANCE-FIX] 💡 Device may not support ZCL reporting - will use Tuya DP');
        }

      } else {
        this.log('[LUMINANCE-FIX] ⚠️ No illuminance cluster - using Tuya DP only');
        this.log('[LUMINANCE-FIX] 📋 Available clusters:', Object.keys(endpoint.clusters || {}));
      }

      // Additional fix: Setup periodic Tuya DP12 queries for continuous updates
      this._setupPeriodicLuminanceQuery();

    } catch (error) {
      this.log('[LUMINANCE-FIX] ❌ Setup error:', error.message);
    }
  }

  /**
   * v5.5.295: Setup periodic luminance query via Tuya DP
   * Fallback for devices that don't support ZCL reporting
   */
  _setupPeriodicLuminanceQuery() {
    // Clear existing timer
    if (this._luminanceQueryTimer) {
      clearInterval(this._luminanceQueryTimer);
    }

    // Query luminance DP every 2 minutes for continuous updates
    this._luminanceQueryTimer = setInterval(async () => {
      try {
        if (this.safeTuyaDataQuery) {
          // Query DP12 (main illuminance) and DP103 (alt illuminance)
          await this.safeTuyaDataQuery([12, 103], {
            logPrefix: '[LUMINANCE-PERIODIC]',
            delayBetweenQueries: 100,
            timeout: 3000
          });
        }
      } catch (e) {
        // Silent - device may be asleep
      }
    }, 2 * 60 * 1000); // Every 2 minutes

    this.log('[LUMINANCE-FIX] ⏰ Periodic DP query started (every 2min)');
  }

  /**
   * v5.5.275: Setup advanced wake strategies with model-specific DPs
   */
  async _setupWakeStrategies() {
    try {
      this.log('[MMWAVE] ⏰ Setting up wake strategies...');

      // v5.5.275: Use model-specific DPs instead of querying all
      const config = this._getModelConfig();
      const allDPs = config.dps || [1, 4, 12, 15];
      this.log(`[MMWAVE] 📋 DPs to query for ${config.type}: ${allDPs.join(', ')}`);

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
   * v5.5.275: Refresh DPs - uses model-specific DP list
   * SIMPLE models only query basic DPs, ADVANCED query all
   */
  async refreshAll() {
    const config = this._getModelConfig();
    this.log(`[RADAR-REFRESH] Refreshing ${config.type} model DPs: ${config.dps.join(', ')}`);

    // v5.5.275: Use model-specific DPs
    const allDPs = config.dps;

    // Use safeTuyaDataQuery for sleepy devices
    return this.safeTuyaDataQuery(allDPs, {
      logPrefix: '[RADAR-REFRESH]',
      delayBetweenQueries: 150,
    });
  }

  /**
   * v5.5.26: Cleanup on device deletion
   * v5.5.295: Added luminance timer cleanup
   */
  async onDeleted() {
    if (this._offlineCheckTimer) {
      clearInterval(this._offlineCheckTimer);
      this._offlineCheckTimer = null;
    }

    // v5.5.295: Cleanup luminance query timer
    if (this._luminanceQueryTimer) {
      clearInterval(this._luminanceQueryTimer);
      this._luminanceQueryTimer = null;
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
