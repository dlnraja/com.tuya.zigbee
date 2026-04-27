'use strict';
const CI = require('../../lib/utils/CaseInsensitiveMatcher');
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');


const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
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

const SENSOR_CONFIGS = require('../../lib/data/SensorConfigs');
const { getManufacturer, getModelId } = require('../../lib/helpers/DeviceDataHelper');

// Build reverse lookup: manufacturerName -> config
const MANUFACTURER_CONFIG_MAP = {};
for (const [configName, config] of Object.entries(SENSOR_CONFIGS)) {
  for (const mfr of config.sensors) {
    MANUFACTURER_CONFIG_MAP[mfr.toLowerCase()] = { ...config, configName };
  }
}

// v7.4.11: Standardized configuration resolution
function getSensorConfig(manufacturerName, modelId = null) {
  const mfr = CI.normalize(manufacturerName);
  const model = CI.normalize(modelId || '');

  // 1. DUAL-KEY MATCH
  if (CI.equalsCI(mfr, 'HOBEIAN') || CI.equalsCI(mfr, 'hobeian')) {
    if (CI.containsCI(model, 'ZG-204ZM')) return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZM, configName: 'HOBEIAN_ZG204ZM' };
    if (CI.containsCI(model, 'ZG-204ZV')) return { ...SENSOR_CONFIGS.ZG_204ZV_MULTISENSOR, configName: 'ZG_204ZV_MULTISENSOR' };
    if (CI.containsCI(model, 'ZG-227Z')) return { ...SENSOR_CONFIGS.HOBEIAN_10G_MULTI, configName: 'HOBEIAN_10G_MULTI' };
    if (CI.containsCI(model, 'ZG-204ZL')) return { ...SENSOR_CONFIGS.ZG_204ZL_PIR, configName: 'ZG_204ZL_PIR' };
    return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZM, configName: 'HOBEIAN_ZG204ZM_FALLBACK' };
  }

  // 2. EXACT MATCH
  const config = MANUFACTURER_CONFIG_MAP[mfr];
  if (config) return config;

  // 3. PATTERN MATCH
  if (manufacturerName) {
    const knownVariants = ['iadro9bf', 'qasjif9e', 'ztqnh5cg', 'sbyx0lm6'];
    if (knownVariants.some(variant => CI.containsCI(manufacturerName, variant))) {
      return { ...SENSOR_CONFIGS.TZE284_IADRO9BF, configName: 'TZE284_IADRO9BF_PATTERN' };
    }
  }

  return SENSOR_CONFIGS.DEFAULT;
}

class MotionSensorRadarDevice extends UnifiedSensorBase {  get mainsPowered() {
  const config = this._getSensorConfig();
  return config.mainsPowered === true || !config.battery;
}

// v5.5.26: Offline check timeout (60 min for mmWave - Hubitat recommendation)
static OFFLINE_CHECK_MS = 60 * 60 * 1000;

/**
    * v7.4.11: Get model-specific configuration from central library
    */
_getSensorConfig() {
  if (!this._sensorConfig) {
    const mfr = getManufacturer(this);
    const model = getModelId(this);
    this._sensorConfig = getSensorConfig(mfr, model);
    this.log(`[MMWAVE]  Config matched: ${this._sensorConfig.configName} for ${mfr} (${model})`);
  }
  return this._sensorConfig;
}

/**
    * v5.5.275: Model-specific capabilities
    */
get sensorCapabilities() {
  const config = this._getSensorConfig();
  const caps = ['alarm_motion', 'alarm_human'];
  
  // Add capabilities from DP map
  for (const dp of Object.values(config.dpMap || {})) {
    if (dp.cap && !caps.includes(dp.cap)) caps.push(dp.cap);
  }
  
  if (config.battery && !caps.includes('measure_battery')) caps.push('measure_battery');
  
  return caps;
}

/**
    * v7.4.11: Standardized DP mappings from central library
    */
get dpMappings() {
  const config = this._getSensorConfig();
  const dpMap = config.dpMap || {};
  const mappings = {};
  
  for (const [dpId, dpConfig] of Object.entries(dpMap)) {
    const dp = parseInt(dpId);
    if (dpConfig.cap) {
      mappings[dp] = {
        capability: dpConfig.cap,
        divisor: dpConfig.divisor || 1,
        transform: (v) => {
          if (dpConfig.multiplier) v = safeMultiply(v, dpConfig.multiplier);
          if (dpConfig.divisor) v = safeDivide(v, dpConfig.divisor);
          if (dpConfig.type === 'presence_bool') return v === 1 || v === true;
          if (dpConfig.type === 'presence_enum') return v === 1 || v === 2;
          return v;
        }
      };
      
      // Auto-set alarm_human for motion sensors
      if (dpConfig.cap === 'alarm_motion') {
        mappings[dp].alsoSets = { 'alarm_human': mappings[dp].transform };
      }
    } else if (dpConfig.internal) {
      mappings[dp] = { internal: dpConfig.internal, divisor: dpConfig.divisor || 1 };
    }
  }
  
  return mappings;
}


async onNodeInit({ zclNode }) {
  // --- Attribute Reporting Configuration (auto-generated) ---
  try {
    await this.configureAttributeReporting([
      {
        cluster: 'ssIasZone',
        attributeName: 'zoneStatus',
        minInterval: 0,
        maxInterval: 3600,
        minChange: 1,
      },
      {
        cluster: 'msIlluminanceMeasurement',
        attributeName: 'measuredValue',
        minInterval: 30,
        maxInterval: 600,
        minChange: 50,
      },
      {
        cluster: 'msTemperatureMeasurement',
        attributeName: 'measuredValue',
        minInterval: 30,
        maxInterval: 600,
        minChange: 50,
      },
      {
        cluster: 'msRelativeHumidity',
        attributeName: 'measuredValue',
        minInterval: 30,
        maxInterval: 600,
        minChange: 100,
      },
      {
        cluster: 'genPowerCfg',
        attributeName: 'batteryPercentageRemaining',
        minInterval: 3600,
        maxInterval: 43200,
        minChange: 2,
      }
    ]);
    this.log('Attribute reporting configured successfully');
  } catch (err) {
    this.log('Attribute reporting config failed (device may not support it):', err.message);
  }

  // v5.5.65: Remove alarm_contact if it was wrongly added (radar uses alarm_motion)
  if (this.hasCapability('alarm_contact')) {
    await this.removeCapability('alarm_contact').catch(() => { });
    this.log('[MMWAVE]  Removed incorrect alarm_contact capability');
  }

  // v5.12.0: RELAY model capability management
  const config = this._getModelConfig();
  if (config.type === 'RELAY') {
    // Add onoff for relay control
    if (!this.hasCapability('onoff')) {
      await this.addCapability('onoff').catch(() => {});
      this.log('[MMWAVE]  Added onoff capability for relay');
    }      for (const cap of ['measure_temperature', 'measure_humidity', 'alarm_human', 'measure_presence_time']) {
      if (this.hasCapability(cap)) {
        await this.removeCapability(cap).catch(() => {});
        this.log(`[MMWAVE]  Removed incorrect ${cap} for RELAY model`);
      }
    }
  }

  this.log('[MMWAVE]  mmWave radar presence sensor ready');
  this.log('[MMWAVE] Model type:', config.type);
  this.log('[MMWAVE] Capabilities:', this.getCapabilities().join(', '));

  // v5.12.0: Register onoff listener for RELAY models (DP108 = breaker_status)
  if (config.type === 'RELAY' && this.hasCapability('onoff')) {
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`[MMWAVE]  Relay control: ${value ? 'ON' : 'OFF'} (DP108)`);
      const tuya = zclNode?.endpoints?.[1]?.clusters?.tuya;
      if (tuya?.datapoint) {
        await tuya.datapoint({ dp: 108, value: value ? 1 : 0, type: 'enum' });
      }
    });
    this.log('[MMWAVE]  Relay onoff listener registered (DP108)');
  }

  await super.onNodeInit({ zclNode });
    // v5.12.5: Continuous Illuminance Reporting (Forum Issue #37)
    try {
      const illum = zclNode.endpoints[1]?.clusters?.illuminanceMeasurement;
      if (illum) {
        await illum.configureReporting({
          measuredValue: { minInterval: 60, maxInterval: 900, minChange: 10 }
        }).catch(e => this.log('[ILLUM] config failed:', e.message));
        this.log('[ILLUM]  Periodic reporting configured');
      }
    } catch (e) { }

  this._registerCapabilityListeners(); // rule-12a injected

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
    this.log('[LUMINANCE-FIX]  No measure_luminance capability - skipping');
    return;
  }

  this.log('[LUMINANCE-FIX]  Setting up continuous luminance reporting...');
  this.log('[LUMINANCE-FIX] Research base: Z2M ZG-204ZL, Tuya docs, HA Community, ZHA, etc.');

  try {
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint) {
      this.log('[LUMINANCE-FIX]  No endpoint 1 found' );
      return;
    }

    // Try to find illuminance measurement cluster (0x0400)
    const illuminanceCluster = endpoint.clusters?.illuminanceMeasurement
        || endpoint.clusters?.msIlluminanceMeasurement
        || endpoint.clusters?.[0x0400]
        || endpoint.clusters?.['1024'];

    if (illuminanceCluster) {
      this.log('[LUMINANCE-FIX]  Illuminance cluster found - configuring reporting' );

      try {
        // Configure autonomous reporting (independent from motion)
        await illuminanceCluster.configureReporting({
          measuredValue: {
            minInterval: 30,      // 30 seconds minimum
            maxInterval: 300,     // 5 minutes maximum
            minChange: 50         // 50 lux minimum change
          }
        });

        this.log('[LUMINANCE-FIX]  Illuminance reporting configured: 30s-300s, 50lux');

        // Setup attribute listener for continuous updates
        illuminanceCluster.on('attr.measuredValue', async (value) => {
          if (value !== null && value !== undefined && value >= 0) {
            this.log(`[LUMINANCE-FIX]  Continuous luminance update: ${value} lux`);
            await this.setCapabilityValue('measure_luminance', parseFloat(value)).catch(() => { });
          }
        });

        // Try initial read
        try {
          const initialValue = await illuminanceCluster.readAttributes(['measuredValue']);
          if (initialValue?.measuredValue !== undefined && initialValue.measuredValue >= 0) {
            this.log(`[LUMINANCE-FIX]  Initial luminance: ${initialValue.measuredValue} lux`);
            await this.setCapabilityValue('measure_luminance', parseFloat(initialValue.measuredValue)).catch(() => { });
          }
        } catch (e) {
          this.log('[LUMINANCE-FIX]  Initial read failed (normal for sleepy devices)');
        }

      } catch (configError) {
        this.log('[LUMINANCE-FIX]  Configure reporting failed:', configError.message);
        this.log('[LUMINANCE-FIX]  Device may not support ZCL reporting - will use Tuya DP');
      }

    } else {
      this.log('[LUMINANCE-FIX]  No illuminance cluster - using Tuya DP only');
      this.log('[LUMINANCE-FIX]  Available clusters:', Object.keys(endpoint.clusters || {}));
    }

    // Additional fix: Setup periodic Tuya DP12 queries for continuous updates
    this._setupPeriodicLuminanceQuery();

  } catch (error) {
    this.log('[LUMINANCE-FIX]  Setup error:', error.message);
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

  // Query luminance DP every 1 minute for continuous updates if mains powered
  const queryInterval = this.mainsPowered ? 1 * 60 * 1000 : 5 * 60 * 1000;
  
  this._luminanceQueryTimer = setInterval(async () => {
    try {
      // v5.13.5: If mains powered, also try direct ZCL read for better accuracy
      if (this.mainsPowered) {
        const ep1 = this.zclNode?.endpoints?.[1];
        const illu = ep1?.clusters?.msIlluminanceMeasurement || ep1?.clusters?.illuminanceMeasurement;
        if (illu) {
          await illu.readAttributes(['measuredValue']).catch(() => {});
        }
      }

      if (this.safeTuyaDataQuery) {
        // Query DP12 (main illuminance) and DP103 (alt illuminance)
        await this.safeTuyaDataQuery([12, 103], {
          logPrefix: '[LUMINANCE-PERIODIC]',
          delayBetweenQueries: 200,
          timeout: 4000
        });
      }
    } catch (e) {
      // Silent - device may be busy
    }
  }, queryInterval);

  this.log(`[LUMINANCE-FIX]  Periodic DP query started (every ${queryInterval/1000}s, mains=${this.mainsPowered})`);
}

/**
   * v5.5.275: Setup advanced wake strategies with model-specific DPs
   */
async _setupWakeStrategies() {
  try {
    this.log('[MMWAVE]  Setting up wake strategies...');

    // v5.5.275: Use model-specific DPs instead of querying all
    const config = this._getModelConfig();
    const allDPs = config.dps || [1, 4, 12, 15];
    this.log(`[MMWAVE]  DPs to query for ${config.type}: ${allDPs.join(', ')}`);

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

    this.log('[MMWAVE]  Wake strategies configured');
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
      this.log(`[MMWAVE]  No event in ${Math.round(elapsed / 60000)} min - marking unavailable`);
      this.setUnavailable('Pas de signal depuis 60+ minutes').catch(() => { });
    } else {
      // Make sure it's available if we received data recently
      this.setAvailable().catch(() => { });
    }
  }, 10 * 60 * 1000); // Every 10 minutes

  this.log('[MMWAVE]  Offline check started (threshold: 60 min)');
}

/**
   * v5.5.26: Send initial data query at inclusion
   * Request all DPs while device is awake after pairing
   */
async _sendInitialDataQuery() {
  try {
    // Small delay to let device settle after pairing
    await new Promise(resolve => setTimeout(resolve, 2000));

    this.log('[MMWAVE]  Sending initial dataQuery...');
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
      this.log('[MMWAVE]  OccupancySensing cluster found - setting up listener' );

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
      this.log('[MMWAVE]  IAS Zone cluster found - setting up motion listener');

      iasCluster.onZoneStatusChangeNotification = (payload) => {
        this._updateLastEventTime(); // v5.5.69: Track activity
        // v5.5.17: Use universal parser from UnifiedSensorBase
        const parsed = this._parseIASZoneStatus(payload?.zoneStatus);
        const motion = parsed.alarm1 || parsed.alarm2;

        this.log(`[ZCL-DATA] mmwave.ias_zone raw=${parsed.raw} alarm1=${parsed.alarm1} alarm2=${parsed.alarm2}  motion=${motion}`);

        if (this.hasCapability('alarm_motion')) {
          this.setCapabilityValue('alarm_motion', motion).catch(this.error );
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
  case 1: //Presence/motion (boolean 0/1)
    this.log(`[ZCL-DATA] mmwave.presence_dp1 raw=${rawValue}  alarm_motion=${rawValue === 1 || rawValue === true}`);
    break;
  case 101: // Presence time (seconds)
    this.log(`[ZCL-DATA] mmwave.presence_time raw=${rawValue}s  measure_presence_time=${rawValue}, alarm_motion=${rawValue > 0}`);
    // v5.5.17: Intelligent presence - if presence_time > 0, someone IS present
    if (rawValue > 0 && this.hasCapability('alarm_motion')) {
      this.setCapabilityValue('alarm_motion', true).catch(this.error);
    }
    break;
  case 102: // Distance to target (cm)
    this.log(`[ZCL-DATA] mmwave.distance raw=${rawValue}cm  measure_luminance.distance=${rawValue}`);
    // v5.5.17: If distance reported, someone is detected
    if (rawValue > 0 && this.hasCapability('alarm_motion')) {
      this.setCapabilityValue('alarm_motion', true).catch(this.error);
    }
    break;
  case 2: // Humidity
    this.log(`[ZCL-DATA] mmwave.humidity raw=${rawValue} converted=${rawValue}`);
    break;
  case 3: // Temperature
    this.log(`[ZCL-DATA] mmwave.temperature raw=${rawValue} converted=${rawValue/10}`);
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

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = MotionSensorRadarDevice;
