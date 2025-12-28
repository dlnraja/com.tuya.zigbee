'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      RADAR/mmWAVE PRESENCE SENSOR - v5.5.277 RONNY CRITICAL FIX             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  v5.5.277: Based on Ronny's diagnostic v5.5.276 "Still not working"         ║
 * ║  - FIX: manufacturerName retrieval (was empty → config DEFAULT)             ║
 * ║  - FIX: Buffer parsing in _handleTuyaResponse (was NaN)                     ║
 * ║  - FIX: Multiple fallback methods to get manufacturerName                   ║
 * ║  - v5.5.276: IAS Zone enrollment for "notEnrolled" status                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTELLIGENT SENSOR CONFIGURATION DATABASE
// Each entry defines the specific DP mappings for a manufacturerName
// ═══════════════════════════════════════════════════════════════════════════════

const SENSOR_CONFIGS = {
  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE A: ZY-M100 Standard (most common)
  // DP1=presence(enum), DP2=sensitivity, DP3=near, DP4=far, DP9=distance, DP101-102=sens
  // ─────────────────────────────────────────────────────────────────────────────
  'ZY_M100_STANDARD': {
    sensors: [
      '_TZE200_ges7h5mj', '_TZE204_ges7h5mj',
      '_TZE200_hl0ss9oa', '_TZE204_hl0ss9oa',
      '_TZE200_holel4dk', '_TZE204_holel4dk',
      '_TZE200_sfiy8puu', '_TZE204_sfiy8puu',
      '_TZE200_pnyz5qpy', '_TZE204_pnyz5qpy',
      '_TZE200_qomxlryd', '_TZE204_qomxlryd',
      '_TZE200_xpq2rber', '_TZE204_xpq2rber',
      '_TZE200_ybwa4x5a', '_TZE204_ybwa4x5a',
      '_TZE204_mrf6vtua', '_TZE204_mtoaryre',
      '_TZE204_r0jdjrvi', '_TZE204_rhgsbacq',
      '_TZE204_sfiy5tfs', '_TZE204_wukb7rhc',
      '_TZE204_auin8mzr', '_TZE204_iaeejhvf',
      '_TZE204_ikvncluo', '_TZE204_jva8ink8',
      '_TZE204_lyetpprm', '_TZE204_no6qtgtl',
    ],
    battery: false,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },      // 0=none, 1=motion, 2=stationary
      2: { cap: null, internal: 'sensitivity' },
      3: { cap: null, internal: 'near_distance' },             // cm
      4: { cap: null, internal: 'far_distance' },              // cm
      9: { cap: 'measure_distance', divisor: 100 },            // cm -> m
      12: { cap: 'measure_luminance', type: 'lux_direct' },    // v5.5.273: Some variants use DP12 for illuminance
      101: { cap: null, internal: 'static_sensitivity' },
      102: { cap: null, internal: 'motion_sensitivity' },
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE B: 24GHz Ceiling Radar (gkfbdvyx variants) - Loginovo M100 C3007
  // Source: ZHA Community https://community.home-assistant.io/t/874026
  // v5.5.266: FIXED - This sensor HAS illuminance on DP103!
  // DP1=presence, DP2=move_sens, DP3=min_dist, DP4=max_dist, DP9=distance
  // DP101=tracking, DP102=presence_sens, DP103=illuminance, DP104=motion_state, DP105=fading
  // ─────────────────────────────────────────────────────────────────────────────
  'ZY_M100_CEILING_24G': {
    sensors: [
      '_TZE200_gkfbdvyx', '_TZE204_gkfbdvyx',
    ],
    battery: false,
    hasIlluminance: true,  // v5.5.266: HAS LUX on DP103!
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },    // 0=none, 1=presence, 2=move
      2: { cap: null, internal: 'motion_sensitivity' },      // 0-10
      3: { cap: null, internal: 'detection_distance_min' },  // ×0.1 = meters
      4: { cap: null, internal: 'detection_distance_max' },  // ×0.1 = meters
      9: { cap: 'measure_distance', divisor: 10 },           // ×0.1 = meters
      101: { cap: null, internal: 'distance_tracking' },     // switch
      102: { cap: null, internal: 'presence_sensitivity' },  // 1-10
      103: { cap: 'measure_luminance', type: 'lux_direct' }, // lux direct
      104: { cap: 'alarm_motion', type: 'presence_enum' },   // motion state enum
      105: { cap: null, internal: 'fading_time' },           // 1-1500 sec
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE B2: Simple presence sensors (no illuminance)
  // ─────────────────────────────────────────────────────────────────────────────
  'ZY_M100_SIMPLE': {
    sensors: [
      '_TZE200_0u3bj3rc', '_TZE200_mx6u6l4y', '_TZE200_v6ossqfy',
    ],
    battery: false,
    hasIlluminance: false,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      101: { cap: null, internal: 'attendance_duration' },
      102: { cap: null, internal: 'absence_duration' },
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE C: ZG-204ZM Battery (sleepy EndDevice)
  // DP1=presence(bool), DP4=battery, DP9=illuminance, DP15=battery_alt
  // ─────────────────────────────────────────────────────────────────────────────
  'ZG_204ZM_BATTERY': {
    sensors: [
      '_TZE200_2aaelwxk', '_TZE204_2aaelwxk',
      '_TZE200_kb5noeto',
    ],
    battery: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      4: { cap: 'measure_battery', divisor: 1 },
      9: { cap: 'measure_luminance', divisor: 1 },
      15: { cap: 'measure_battery', divisor: 1 },
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE D: TZE284 ZY-M100-S_2 Series (newer chips with HIGH DP numbers)
  // Source: ZHA quirk https://github.com/zigpy/zha-device-handlers/issues/2852
  // Z2M Issue #27212: Some variants report presence/distance as NULL
  // v5.5.268: RONNY FIX - Added DP1 fallback + periodic polling + debug logging
  // DP104=illuminance(raw->lux), DP105=motion_state, DP106=motion_sens, DP107=max_range
  // DP109=target_distance, DP110=fading_time, DP111=presence_sens, DP112=occupancy
  // FALLBACK: Some firmware uses DP1 for presence instead of DP105/DP112
  // ─────────────────────────────────────────────────────────────────────────────
  'TZE284_SERIES': {
    sensors: [
      '_TZE284_iadro9bf', '_TZE284_n5q2t8na',
      '_TZE284_ztc6ggyl', '_TZE284_ijxvkhd0',
      '_TZE284_qasjif9e', '_TZE284_sxm7l9xa',
      '_TZE284_xsm7l9xa', '_TZE284_yrwmnya3',
      '_TZE204_ijxvkhd0', '_TZE204_e5m9c5hl',
      '_TZE204_qasjif9e',
    ],
    battery: false,
    hasIlluminance: true,
    needsPolling: true,  // v5.5.268: Enable periodic DP polling for stubborn devices
    dpMap: {
      // v5.5.268: Add DP1 as FALLBACK for presence (some firmware variants)
      1: { cap: 'alarm_motion', type: 'presence_enum', fallback: true },
      104: { cap: 'measure_luminance', type: 'lux_raw' },
      105: { cap: 'alarm_motion', type: 'presence_enum' },    // Primary presence
      106: { cap: null, internal: 'motion_sensitivity' },
      107: { cap: null, internal: 'max_range' },
      108: { cap: null, internal: 'detection_delay' },        // v5.5.268: Added
      109: { cap: 'measure_distance', divisor: 100 },
      110: { cap: null, internal: 'fading_time' },
      111: { cap: null, internal: 'presence_sensitivity' },
      112: { cap: 'alarm_motion', type: 'presence_bool' },    // Secondary presence
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE E: 7gclukjs variant (fall detection)
  // DP1=presence, DP2=sensitivity, DP101=distance, DP102=illuminance, DP112=presence_alt
  // ─────────────────────────────────────────────────────────────────────────────
  'FALL_DETECTION': {
    sensors: [
      '_TZE200_7gclukjs', '_TZE204_7gclukjs',
    ],
    battery: false,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },
      2: { cap: null, internal: 'sensitivity' },
      101: { cap: 'measure_distance', divisor: 100 },
      102: { cap: 'measure_luminance', divisor: 1 },
      112: { cap: 'alarm_motion', type: 'presence_enum' },
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE F: laokfqwu/ztqnh5cg (illuminance focused)
  // DP1=presence, DP6=fading, DP9=illuminance, DP101=target_distance
  // ─────────────────────────────────────────────────────────────────────────────
  'ILLUMINANCE_FOCUS': {
    sensors: [
      '_TZE200_laokfqwu', '_TZE200_ztqnh5cg',
      '_tze200_y4mdop0b',
    ],
    battery: false,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      6: { cap: null, internal: 'fading_time' },
      9: { cap: 'measure_luminance', divisor: 1 },
      101: { cap: 'measure_distance', divisor: 100 },
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE G: TZ3000 PIR Sensors (standard PIR, not radar)
  // Uses ZCL occupancy cluster primarily
  // ─────────────────────────────────────────────────────────────────────────────
  'TZ3000_PIR': {
    sensors: [
      '_TZ3000_8bxrzyxz', '_TZ3000_aigddb2b',
      '_TZ3000_ky0fq4ho', '_TZ3210_fkzihax8',
      '_TZ321C_fkzihax8',
    ],
    battery: true,
    useZcl: true,
    dpMap: {
      // PIR uses ZCL occupancy, not Tuya DPs
    }
  },
};

// Build reverse lookup: manufacturerName -> config
const MANUFACTURER_CONFIG_MAP = {};
for (const [configName, config] of Object.entries(SENSOR_CONFIGS)) {
  for (const mfr of config.sensors) {
    MANUFACTURER_CONFIG_MAP[mfr] = { ...config, configName };
  }
}

// Get sensor config by manufacturerName
function getSensorConfig(manufacturerName) {
  return MANUFACTURER_CONFIG_MAP[manufacturerName] || SENSOR_CONFIGS.ZY_M100_STANDARD;
}

// Transform presence value based on type
function transformPresence(value, type) {
  switch (type) {
    case 'presence_enum':
      // 0=none, 1=motion, 2=stationary -> true if motion or stationary
      return value === 1 || value === 2;
    case 'presence_bool':
      return value === 1 || value === true || value === 'presence';
    case 'presence_string':
      return value === 'motion' || value === 'stationary' || value === 'presence';
    default:
      return !!value;
  }
}

// v5.5.264: Sanity check and transform illuminance value
// ZY-M100 spec: 0-2000 LUX max
// TZE284 sensors report RAW ADC values that need log10 conversion
function transformLux(value, type) {
  let lux = value;

  // v5.5.264: TZE284 sensors report RAW ADC values
  // Formula from ZHA: lux = 10^(raw/10000) or simpler: raw/10 for display
  if (type === 'lux_raw') {
    // Raw ADC value - apply logarithmic conversion
    // Based on Z2M issue #18950: raw values are NOT in lux
    if (value > 0) {
      // Method 1: Log10 conversion (ZHA formula)
      // lux = Math.pow(10, value / 10000);
      // Method 2: Simple division (more practical for Tuya sensors)
      lux = Math.round(value / 10);
    } else {
      lux = 0;
    }
  }
  // Some sensors report raw value that needs no conversion
  else if (type === 'lux_direct') {
    lux = value;
  }
  // Some sensors report value * 10
  else if (type === 'lux_div10') {
    lux = value / 10;
  }

  // Sanity check: ZY-M100 max is 2000 lux
  // If value > 10000, it's probably raw sensor data needing conversion
  if (lux > 10000) {
    // Likely raw ADC value, apply rough conversion
    lux = Math.min(2000, Math.round(lux / 100));
  } else if (lux > 2000) {
    // Clamp to max spec value
    lux = 2000;
  }

  return Math.max(0, Math.round(lux));
}

// Sanity check distance value (0-10m range)
function transformDistance(value, divisor = 100) {
  let distance = value / divisor;

  // Sanity check: most radar sensors have 0-10m range
  if (distance < 0) distance = 0;
  if (distance > 10) distance = 10;

  return Math.round(distance * 100) / 100; // 2 decimal places
}

class PresenceSensorRadarDevice extends HybridSensorBase {

  /**
   * v5.5.277: Get manufacturerName with multiple fallback methods
   * Ronny fix: this.getData()?.manufacturerName was returning empty!
   */
  _getManufacturerName() {
    if (this._cachedManufacturerName) return this._cachedManufacturerName;

    // Method 1: getData() (Homey standard)
    let mfr = this.getData()?.manufacturerName;

    // Method 2: Settings (stored during pairing)
    if (!mfr) mfr = this.getSetting('zb_manufacturer_name');

    // Method 3: Store data
    if (!mfr) mfr = this.getStoreValue('manufacturerName');

    // Method 4: ZCL node basic cluster (if available)
    if (!mfr && this.zclNode?.endpoints?.[1]?.clusters?.basic) {
      try {
        mfr = this.zclNode.endpoints[1].clusters.basic.manufacturerName;
      } catch (e) { /* ignore */ }
    }

    // Method 5: Driver manifest match (from pairing)
    if (!mfr) {
      const manifest = this.driver?.manifest;
      if (manifest?.zigbee?.manufacturerName?.[0]) {
        mfr = manifest.zigbee.manufacturerName[0];
      }
    }

    this._cachedManufacturerName = mfr || '';
    return this._cachedManufacturerName;
  }

  /**
   * v5.5.277: Get sensor configuration based on manufacturerName
   */
  _getSensorConfig() {
    if (!this._sensorConfig) {
      const mfr = this._getManufacturerName();
      this._sensorConfig = getSensorConfig(mfr);
      this.log(`[RADAR] 🔍 ManufacturerName resolved: "${mfr}" → config: ${this._sensorConfig.configName || 'DEFAULT'}`);
    }
    return this._sensorConfig;
  }

  /**
   * v5.5.254: Dynamic power source detection from config
   */
  get mainsPowered() {
    return !this._getSensorConfig().battery;
  }

  /**
   * v5.5.254: Dynamic capabilities based on sensor config
   */
  get sensorCapabilities() {
    const config = this._getSensorConfig();
    const caps = ['alarm_motion', 'alarm_human'];

    // Add capabilities based on what DPs are mapped
    const dpMap = config.dpMap || {};
    for (const dp of Object.values(dpMap)) {
      if (dp.cap && !caps.includes(dp.cap)) {
        caps.push(dp.cap);
      }
    }

    // Ensure battery capability for battery sensors
    if (config.battery && !caps.includes('measure_battery')) {
      caps.push('measure_battery');
    }

    return caps;
  }

  /**
   * v5.5.254: INTELLIGENT DP MAPPINGS
   * Builds dpMappings dynamically from sensor config database
   */
  get dpMappings() {
    const config = this._getSensorConfig();
    const mfr = this.getData()?.manufacturerName || '';
    const dpMap = config.dpMap || {};
    const mappings = {};

    this.log(`[RADAR] 🧠 Using config: ${config.configName || 'DEFAULT'} for ${mfr}`);

    for (const [dpId, dpConfig] of Object.entries(dpMap)) {
      const dp = parseInt(dpId);

      if (dpConfig.cap === 'alarm_motion' || dpConfig.cap === 'alarm_human') {
        // Presence DP - use intelligent transform
        mappings[dp] = {
          capability: 'alarm_motion',
          transform: (v) => transformPresence(v, dpConfig.type),
          alsoSets: { 'alarm_human': (v) => transformPresence(v, dpConfig.type) }
        };
      } else if (dpConfig.cap === 'measure_luminance') {
        // Illuminance DP - use sanity-checked transform
        mappings[dp] = {
          capability: dpConfig.cap,
          transform: (v) => transformLux(v, dpConfig.type || 'lux_direct'),
        };
      } else if (dpConfig.cap === 'measure_distance') {
        // Distance DP - use sanity-checked transform
        mappings[dp] = {
          capability: dpConfig.cap,
          transform: (v) => transformDistance(v, dpConfig.divisor || 100),
        };
      } else if (dpConfig.cap) {
        // Other capability DP
        mappings[dp] = {
          capability: dpConfig.cap,
          divisor: dpConfig.divisor || 1,
          transform: dpConfig.divisor ? (v) => v / dpConfig.divisor : undefined,
        };
      } else if (dpConfig.internal) {
        // Internal setting DP
        mappings[dp] = {
          capability: null,
          internal: dpConfig.internal,
          writable: true,
          divisor: dpConfig.divisor || 1,
        };
      }
    }

    // Add fallback DPs that might not be in config
    if (!mappings[112]) {
      mappings[112] = { capability: 'alarm_motion', transform: (v) => transformPresence(v, 'presence_enum') };
    }

    return mappings;
  }

  async onNodeInit({ zclNode }) {
    const mfr = this.getData()?.manufacturerName || '';
    const config = this._getSensorConfig();

    this.log(`[RADAR] ═══════════════════════════════════════════════════════════`);
    this.log(`[RADAR] v5.5.268 RONNY DEEP FIX (Z2M #27212 research)`);
    this.log(`[RADAR] ManufacturerName: ${mfr}`);
    this.log(`[RADAR] Config: ${config.configName || 'ZY_M100_STANDARD (default)'}`);
    this.log(`[RADAR] Power: ${config.battery ? 'BATTERY (EndDevice)' : 'MAINS (Router)'}`);
    this.log(`[RADAR] Illuminance: ${config.hasIlluminance !== false ? 'YES' : 'NO'}`);
    this.log(`[RADAR] Polling: ${config.needsPolling ? 'ENABLED (30s interval)' : 'DISABLED'}`);
    this.log(`[RADAR] DPs: ${Object.keys(config.dpMap || {}).join(', ') || 'ZCL only'}`);
    this.log(`[RADAR] ═══════════════════════════════════════════════════════════`);

    // v5.5.268: Track received DPs for debugging
    this._receivedDPs = new Set();
    this._lastPresenceUpdate = 0;

    // Battery sensors: minimal init to avoid timeouts
    if (config.battery) {
      this.log('[RADAR] ⚡ BATTERY MODE: Using minimal init (passive listeners only)');

      this.zclNode = zclNode;

      // Add battery capability
      if (!this.hasCapability('measure_battery')) {
        try {
          await this.addCapability('measure_battery');
          this.log('[RADAR] ✅ Added measure_battery');
        } catch (e) { /* ignore */ }
      }

      // Setup passive listeners only (no queries)
      this._setupPassiveListeners(zclNode);

      // Mark as available immediately
      await this.setAvailable().catch(() => { });

      this.log('[RADAR] ✅ Battery sensor ready (passive mode)');
      return;
    }

    // PIR sensors: use ZCL primarily
    if (config.useZcl) {
      this.log('[RADAR] 📡 ZCL MODE: Using ZCL occupancy cluster');
      await super.onNodeInit({ zclNode });
      await this._setupZclClusters(zclNode);
      this.log('[RADAR] ✅ PIR sensor ready (ZCL mode)');
      return;
    }

    // Mains-powered radar sensors: full init
    await super.onNodeInit({ zclNode });
    await this._setupZclClusters(zclNode);

    // v5.5.270: CRITICAL FIX - Setup Tuya DP listeners for mains-powered sensors too!
    // This was missing and caused presence not to work on TZE284 devices
    await this._setupTuyaDPListeners(zclNode);

    // Ensure required capabilities
    for (const cap of ['measure_distance', 'measure_luminance']) {
      if (!this.hasCapability(cap)) {
        try {
          await this.addCapability(cap);
          this.log(`[RADAR] ✅ Added ${cap} capability`);
        } catch (e) { /* ignore */ }
      }
    }

    // v5.5.268: Start periodic polling for TZE284 devices that need it
    if (config.needsPolling) {
      this._startPresencePolling(zclNode);
    }

    this.log('[RADAR] ✅ Radar presence sensor ready (full mode)');
  }

  /**
   * v5.5.252: Setup passive listeners for battery sensors
   * These only listen for incoming data, no outgoing queries
   */
  _setupPassiveListeners(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    // Listen for Tuya DP reports (cluster 0xEF00)
    try {
      const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184];
      if (tuyaCluster?.on) {
        tuyaCluster.on('response', (data) => {
          this.log('[RADAR-BATTERY] Tuya response received');
          this._handleTuyaResponse(data);
        });
        tuyaCluster.on('reporting', (data) => {
          this.log('[RADAR-BATTERY] Tuya reporting received');
          this._handleTuyaResponse(data);
        });
        tuyaCluster.on('datapoint', (data) => {
          this.log('[RADAR-BATTERY] Tuya datapoint received');
          this._handleTuyaResponse(data);
        });
        this.log('[RADAR] ✅ Passive Tuya listener configured');
      }
    } catch (e) { /* ignore */ }

    // Listen for occupancy reports
    try {
      const occCluster = ep1.clusters?.msOccupancySensing;
      if (occCluster?.on) {
        occCluster.on('attr.occupancy', (v) => {
          const occupied = (v & 0x01) !== 0;
          this.log(`[RADAR-BATTERY] Occupancy: ${occupied}`);
          this.setCapabilityValue('alarm_motion', occupied).catch(() => { });
        });
        this.log('[RADAR] ✅ Passive occupancy listener configured');
      }
    } catch (e) { /* ignore */ }
  }

  /**
   * v5.5.277: Parse Buffer data to integer value
   * Ronny fix: data.data was Buffer [0,0,13,70] → need to parse to 3398
   */
  _parseBufferValue(data) {
    // Already a number
    if (typeof data === 'number') return data;
    if (typeof data === 'boolean') return data ? 1 : 0;

    // Buffer object: {type: "Buffer", data: [0,0,13,70]}
    if (data && typeof data === 'object') {
      let bytes = null;

      // Format 1: {type: "Buffer", data: [...]}
      if (data.type === 'Buffer' && Array.isArray(data.data)) {
        bytes = data.data;
      }
      // Format 2: Node.js Buffer
      else if (Buffer.isBuffer(data)) {
        bytes = Array.from(data);
      }
      // Format 3: Array directly
      else if (Array.isArray(data)) {
        bytes = data;
      }

      if (bytes && bytes.length > 0) {
        // Parse as big-endian unsigned integer
        let value = 0;
        for (let i = 0; i < bytes.length; i++) {
          value = (value << 8) | (bytes[i] & 0xFF);
        }
        return value;
      }
    }

    // String number
    if (typeof data === 'string' && !isNaN(data)) {
      return parseInt(data, 10);
    }

    return data;
  }

  /**
   * v5.5.277: Handle Tuya response - FIXED Buffer parsing
   * Ronny fix: value was NaN because Buffer wasn't parsed
   */
  _handleTuyaResponse(data) {
    if (!data) return;

    // Mark device as available when we receive data
    this.setAvailable().catch(() => { });

    // Process DPs
    const dpMappings = this.dpMappings;
    const dpId = data.dp || data.dpId || data.datapoint;

    // v5.5.277: Parse the value properly (could be Buffer, number, etc.)
    let rawValue = data.value;
    if (rawValue === undefined || rawValue === null) {
      rawValue = data.data;
    }
    const value = this._parseBufferValue(rawValue);

    // v5.5.268: Log ALL DPs for debugging unknown variants
    this._logUnknownDP(dpId, value, data);

    if (dpId && dpMappings[dpId]) {
      const mapping = dpMappings[dpId];
      if (mapping.capability) {
        let finalValue = value;
        if (mapping.transform) {
          finalValue = mapping.transform(value);
        } else if (mapping.divisor) {
          finalValue = value / mapping.divisor;
        }

        // v5.5.277: Validate finalValue is not NaN
        if (typeof finalValue === 'number' && isNaN(finalValue)) {
          this.log(`[RADAR] ⚠️ DP${dpId} → ${mapping.capability} = NaN (skipping, raw: ${JSON.stringify(rawValue)})`);
          return;
        }

        this.log(`[RADAR] DP${dpId} → ${mapping.capability} = ${finalValue}`);
        this.setCapabilityValue(mapping.capability, finalValue).catch(() => { });

        // v5.5.268: Track presence updates for polling logic
        if (mapping.capability === 'alarm_motion') {
          this._updatePresenceTimestamp();
        }
      }
    } else if (dpId) {
      // v5.5.273: Only log UNMAPPED if not already handled by base class
      if (!this._recentlyHandledDPs?.has(dpId)) {
        this.log(`[RADAR] ℹ️ DP${dpId} = ${value} (not in local config, may be handled by base class)`);
      }
    }
  }

  async _setupZclClusters(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    // Illuminance cluster (0x0400)
    try {
      const illumCluster = ep1.clusters?.msIlluminanceMeasurement;
      if (illumCluster?.on) {
        illumCluster.on('attr.measuredValue', (v) => {
          const lux = Math.pow(10, (v - 1) / 10000);
          this.setCapabilityValue('measure_luminance', Math.round(lux)).catch(() => { });
        });
        this.log('[RADAR] ✅ Illuminance cluster configured');
      }
    } catch (e) { /* ignore */ }

    // Occupancy cluster (0x0406)
    try {
      const occCluster = ep1.clusters?.msOccupancySensing;
      if (occCluster?.on) {
        occCluster.on('attr.occupancy', (v) => {
          const occupied = (v & 0x01) !== 0;
          this.setCapabilityValue('alarm_motion', occupied).catch(() => { });
        });
        this.log('[RADAR] ✅ Occupancy cluster configured');
      }
    } catch (e) { /* ignore */ }

    // v5.5.276: IAS Zone enrollment fix (ChatGPT analysis #723)
    // Fixes "notEnrolled" status that prevents proper motion detection
    await this._enrollIASZone(zclNode);
  }

  /**
   * v5.5.276: IAS Zone enrollment - fixes "notEnrolled" status
   * ChatGPT analysis #723: ZoneState = notEnrolled prevents motion detection
   */
  async _enrollIASZone(zclNode) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      const iasZone = ep1?.clusters?.iasZone || ep1?.clusters?.ssIasZone;

      if (!iasZone) {
        this.log('[RADAR] ℹ️ No IAS Zone cluster - skipping enrollment');
        return;
      }

      this.log('[RADAR] 🔐 Attempting IAS Zone enrollment...');

      // Step 1: Read current zone state
      try {
        const attrs = await iasZone.readAttributes(['zoneState', 'zoneType', 'zoneStatus']);
        this.log(`[RADAR] IAS Zone state: ${JSON.stringify(attrs)}`);

        // If already enrolled, skip
        if (attrs?.zoneState === 1) {
          this.log('[RADAR] ✅ IAS Zone already enrolled');
          return;
        }
      } catch (e) { /* continue with enrollment */ }

      // Step 2: Write IAS CIE address (Homey's IEEE address)
      try {
        const homeyIeee = this.homey?.zigbee?.ieeeAddress || '0000000000000000';
        await iasZone.writeAttributes({ iasCieAddress: homeyIeee });
        this.log(`[RADAR] ✅ Wrote IAS CIE address: ${homeyIeee}`);
      } catch (e) {
        this.log(`[RADAR] ⚠️ Could not write IAS CIE: ${e.message}`);
      }

      // Step 3: Send zone enroll response
      try {
        if (iasZone.zoneEnrollResponse) {
          await iasZone.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 1 });
          this.log('[RADAR] ✅ IAS Zone enroll response sent');
        }
      } catch (e) {
        this.log(`[RADAR] ⚠️ Zone enroll response failed: ${e.message}`);
      }

      // Step 4: Listen for zone status changes
      if (iasZone.on) {
        iasZone.on('attr.zoneStatus', (status) => {
          const alarm1 = (status & 0x01) !== 0;
          const alarm2 = (status & 0x02) !== 0;
          const motion = alarm1 || alarm2;
          this.log(`[RADAR] IAS Zone status: ${status} -> motion: ${motion}`);
          this.setCapabilityValue('alarm_motion', motion).catch(() => { });
        });

        iasZone.onZoneStatusChangeNotification = (payload) => {
          const status = payload?.zoneStatus || 0;
          const motion = (status & 0x03) !== 0;
          this.log(`[RADAR] IAS Zone notification: ${status} -> motion: ${motion}`);
          this.setCapabilityValue('alarm_motion', motion).catch(() => { });
        };

        this.log('[RADAR] ✅ IAS Zone listeners configured');
      }
    } catch (e) {
      this.log(`[RADAR] ⚠️ IAS Zone enrollment error: ${e.message}`);
    }
  }

  /**
   * v5.5.270: CRITICAL FIX for Ronny's TZE284 sensor
   * Setup Tuya DP listeners for mains-powered radar sensors
   * This was MISSING and caused presence to never update!
   */
  async _setupTuyaDPListeners(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    this.log('[RADAR] 🔧 Setting up Tuya DP listeners for mains-powered sensor...');

    // Try multiple cluster access methods
    const tuyaCluster = ep1.clusters?.tuya ||
      ep1.clusters?.['tuya'] ||
      ep1.clusters?.[61184] ||
      ep1.clusters?.['61184'] ||
      ep1.clusters?.manuSpecificTuya;

    if (tuyaCluster) {
      this.log('[RADAR] ✅ Found Tuya cluster');

      // Listen for all possible event types
      const events = ['response', 'reporting', 'datapoint', 'report', 'data', 'set'];
      for (const event of events) {
        try {
          if (typeof tuyaCluster.on === 'function') {
            tuyaCluster.on(event, (data) => {
              this.log(`[RADAR] 📡 Tuya ${event} event received`);
              this._handleTuyaResponse(data);
            });
            this.log(`[RADAR] ✅ Listening for Tuya '${event}' events`);
          }
        } catch (e) { /* ignore */ }
      }

      // Also try to register for attribute reports
      try {
        if (tuyaCluster.onReport) {
          tuyaCluster.onReport((report) => {
            this.log('[RADAR] 📡 Tuya onReport received');
            this._handleTuyaResponse(report);
          });
        }
      } catch (e) { /* ignore */ }
    } else {
      this.log('[RADAR] ⚠️ Tuya cluster not found - trying alternative methods');

      // Try binding to EF00 cluster directly
      try {
        const { Cluster } = require('zigbee-clusters');
        const TuyaCluster = Cluster.getCluster(61184);
        if (TuyaCluster && ep1.bind) {
          this.log('[RADAR] 🔧 Attempting direct EF00 cluster bind');
        }
      } catch (e) { /* ignore */ }
    }

    // Also try the node-level listeners
    try {
      if (zclNode.on) {
        zclNode.on('command', (cmd) => {
          if (cmd.cluster === 61184 || cmd.cluster === 'tuya') {
            this.log('[RADAR] 📡 Node command received from Tuya cluster');
            this._handleTuyaResponse(cmd.data || cmd);
          }
        });
      }
    } catch (e) { /* ignore */ }

    this.log('[RADAR] ✅ Tuya DP listeners configured for mains-powered sensor');
  }

  /**
   * v5.5.268: RONNY FIX - Periodic polling for TZE284 devices
   * Some firmware variants don't auto-report presence/distance (Z2M #27212)
   * This polls the device every 30 seconds to request DP updates
   */
  _startPresencePolling(zclNode) {
    this.log('[RADAR] 🔄 Starting presence polling (30s interval) for TZE284 variant');

    // Clear any existing interval
    if (this._pollingInterval) {
      clearInterval(this._pollingInterval);
    }

    // Poll every 30 seconds
    this._pollingInterval = setInterval(async () => {
      try {
        // Check if we've received presence updates recently
        const now = Date.now();
        const timeSinceLastPresence = now - (this._lastPresenceUpdate || 0);

        // Only poll if no presence update in last 60 seconds
        if (timeSinceLastPresence > 60000) {
          this.log('[RADAR] 🔄 No presence update in 60s, requesting DP refresh...');
          await this._requestDPRefresh(zclNode);
        }
      } catch (e) {
        this.log(`[RADAR] ⚠️ Polling error: ${e.message}`);
      }
    }, 30000);

    // Initial poll after 5 seconds
    setTimeout(() => this._requestDPRefresh(zclNode), 5000);
  }

  /**
   * v5.5.268: Request DP refresh from device
   * Sends Tuya MCU command to request all DP values
   */
  async _requestDPRefresh(zclNode) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      const tuyaCluster = ep1?.clusters?.tuya || ep1?.clusters?.[61184];

      if (tuyaCluster?.dataQuery) {
        // Request all datapoints
        await tuyaCluster.dataQuery();
        this.log('[RADAR] 📡 DP refresh requested');
      } else if (tuyaCluster?.sendData) {
        // Alternative: send empty data request
        await tuyaCluster.sendData({ dp: 0, datatype: 0, data: Buffer.from([]) });
        this.log('[RADAR] 📡 DP refresh requested (alt method)');
      }
    } catch (e) {
      // Silently ignore - device may not support query
    }
  }

  /**
   * v5.5.268: Enhanced DP logging for debugging unknown variants
   * Logs ALL incoming DPs to help identify correct mappings
   */
  _logUnknownDP(dpId, value, rawData) {
    if (!this._receivedDPs) this._receivedDPs = new Set();

    const isNew = !this._receivedDPs.has(dpId);
    this._receivedDPs.add(dpId);

    const prefix = isNew ? '🆕 NEW' : '📊';
    this.log(`[RADAR] ${prefix} DP${dpId} = ${value} (raw: ${JSON.stringify(rawData)})`);

    // Log summary of all received DPs periodically
    if (isNew) {
      this.log(`[RADAR] 📋 All DPs received so far: [${Array.from(this._receivedDPs).sort((a, b) => a - b).join(', ')}]`);
    }
  }

  /**
   * v5.5.268: Update presence timestamp when motion detected
   */
  _updatePresenceTimestamp() {
    this._lastPresenceUpdate = Date.now();
  }

  /**
   * v5.5.268: Cleanup on device removal
   */
  onDeleted() {
    if (this._pollingInterval) {
      clearInterval(this._pollingInterval);
      this._pollingInterval = null;
    }
    super.onDeleted?.();
  }
}

module.exports = PresenceSensorRadarDevice;
