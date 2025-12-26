'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      RADAR/mmWAVE PRESENCE SENSOR - v5.5.254 INTELLIGENT DP MAPPINGS        ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  v5.5.254: Intelligent dynamic DP mappings per manufacturerName             ║
 * ║  - Auto-detects sensor type and applies correct DP configuration            ║
 * ║  - Supports ZY-M100, ZG-204ZM, MTD285-ZB, and many more variants           ║
 * ║  - Battery vs mains-powered detection                                       ║
 * ║  - Handles presence states: boolean, enum (0/1/2), string                   ║
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
      101: { cap: null, internal: 'static_sensitivity' },
      102: { cap: null, internal: 'motion_sensitivity' },
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE B: ZY-M100 Wall Mount (gkfbdvyx variants)
  // DP1=presence(enum), DP3=near(÷100), DP4=far(÷100), DP9=distance(÷100), DP101=static, DP102=motion
  // ─────────────────────────────────────────────────────────────────────────────
  'ZY_M100_WALL': {
    sensors: [
      '_TZE200_gkfbdvyx', '_TZE204_gkfbdvyx',
    ],
    battery: false,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },
      3: { cap: null, internal: 'near_distance', divisor: 100 },
      4: { cap: null, internal: 'far_distance', divisor: 100 },
      9: { cap: 'measure_distance', divisor: 100 },
      101: { cap: null, internal: 'static_sensitivity' },
      102: { cap: null, internal: 'motion_sensitivity' },
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
  // TYPE D: TZE284 Series (newer chips)
  // DP1=presence(enum), DP9=distance, DP101=static, DP102=motion, DP104=illuminance
  // ─────────────────────────────────────────────────────────────────────────────
  'TZE284_SERIES': {
    sensors: [
      '_TZE284_iadro9bf', '_TZE284_n5q2t8na',
      '_TZE284_ztc6ggyl', '_TZE284_ijxvkhd0',
      '_TZE284_qasjif9e', '_TZE284_sxm7l9xa',
      '_TZE284_xsm7l9xa', '_TZE284_yrwmnya3',
    ],
    battery: false,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },
      9: { cap: 'measure_distance', divisor: 100 },
      101: { cap: null, internal: 'static_sensitivity' },
      102: { cap: null, internal: 'motion_sensitivity' },
      104: { cap: 'measure_luminance', divisor: 1 },
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

class PresenceSensorRadarDevice extends HybridSensorBase {

  /**
   * v5.5.254: Get sensor configuration based on manufacturerName
   */
  _getSensorConfig() {
    if (!this._sensorConfig) {
      const mfr = this.getData()?.manufacturerName || '';
      this._sensorConfig = getSensorConfig(mfr);
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

    this.log(`[RADAR] ═══════════════════════════════════════════════════════`);
    this.log(`[RADAR] v5.5.254 INTELLIGENT DP MAPPINGS`);
    this.log(`[RADAR] ManufacturerName: ${mfr}`);
    this.log(`[RADAR] Config: ${config.configName || 'ZY_M100_STANDARD (default)'}`);
    this.log(`[RADAR] Power: ${config.battery ? 'BATTERY (EndDevice)' : 'MAINS (Router)'}`);
    this.log(`[RADAR] DPs: ${Object.keys(config.dpMap || {}).join(', ') || 'ZCL only'}`);
    this.log(`[RADAR] ═══════════════════════════════════════════════════════`);

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

    // Ensure required capabilities
    for (const cap of ['measure_distance', 'measure_luminance']) {
      if (!this.hasCapability(cap)) {
        try {
          await this.addCapability(cap);
          this.log(`[RADAR] ✅ Added ${cap} capability`);
        } catch (e) { /* ignore */ }
      }
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
   * v5.5.252: Handle Tuya response for battery sensors
   */
  _handleTuyaResponse(data) {
    if (!data) return;

    // Mark device as available when we receive data
    this.setAvailable().catch(() => { });

    // Process DPs
    const dpMappings = this.dpMappings;
    const dpId = data.dp || data.dpId || data.datapoint;
    const value = data.value ?? data.data;

    if (dpId && dpMappings[dpId]) {
      const mapping = dpMappings[dpId];
      if (mapping.capability) {
        let finalValue = value;
        if (mapping.transform) {
          finalValue = mapping.transform(value);
        } else if (mapping.divisor) {
          finalValue = value / mapping.divisor;
        }
        this.log(`[RADAR-BATTERY] DP${dpId} → ${mapping.capability} = ${finalValue}`);
        this.setCapabilityValue(mapping.capability, finalValue).catch(() => { });
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
  }
}

module.exports = PresenceSensorRadarDevice;
