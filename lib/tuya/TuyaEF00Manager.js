'use strict';

const { EventEmitter } = require('events');
const TuyaDPParser = require('./TuyaDPParser');
const { getDeviceInfo, getDPMappings, parseValue } = require('../utils/DriverMappingLoader');
const { getTuyaProfile } = require('./TuyaProfiles');
const { getModelId, getManufacturer } = require('../helpers/DeviceDataHelper');
const LocalTuyaEntityHandler = require('./LocalTuyaEntityHandler');

// v5.5.39: Import TuyaBoundCluster for receiving DP reports
let TuyaBoundCluster;
try {
  TuyaBoundCluster = require('../clusters/TuyaBoundCluster');
} catch (e) {
  TuyaBoundCluster = null;
}

// v5.3.62: Import adaptive data parser for universal data handling
let AdaptiveDataParser;
try {
  AdaptiveDataParser = require('../utils/AdaptiveDataParser');
} catch (e) {
  AdaptiveDataParser = null;
}

// v5.2.9: Import retry utility for better timeout handling
let RetryWithBackoff;
try {
  RetryWithBackoff = require('../utils/RetryWithBackoff');
} catch (e) {
  // Fallback if not available
  RetryWithBackoff = null;
}

/**
 * TuyaEF00Manager - Manage Tuya EF00 cluster datapoints
 *
 * Based on official Tuya Developer documentation:
 * https://developer.tuya.com/en/docs/connect-subdevices-to-gateways
 * https://developer.tuya.com/en/docs/iot/custom-functions
 *
 * Handles:
 * - Time synchronization (DP 0x24, 0x67)
 * - Data Point (DP) parsing and encoding
 * - Automatic daily time sync
 * - Multi-Gang Switch standard (DP1-4, DP7-10, DP14-16, DP19, DP29-32)
 * - All DP types: Boolean, Value, String, Enum, Bitmap, Raw
 *
 * v5.5.382: COMPREHENSIVE TIME SYNC FORMATS
 * Supports all Tuya/Zigbee time synchronization formats:
 * - ZIGBEE_2000: Standard Zigbee (seconds since 2000-01-01)
 * - UNIX_1970: Unix epoch (seconds since 1970-01-01)
 * - TUYA_STANDARD: 7 bytes [YY, MM, DD, HH, MM, SS, Weekday]
 * - TUYA_MCU: 8-9 bytes with header for cluster 0xEF00 cmd 0x24
 * - TUYA_EXTENDED_TZ: 9 bytes with timezone offset
 * - TUYA_TIMESTAMP_8: 8 bytes [Local:4][UTC:4] for LCD climate sensors
 *
 * Integrates with:
 * - TuyaDPParser: Low-level DP encoding/decoding
 * - HybridProtocolManager: Intelligent Tuya DP vs Zigbee native routing
 * - TuyaMultiGangManager: Multi-gang switch features
 */

// v5.5.384: COMPREHENSIVE Time format constants - ALL POSSIBLE FORMATS
// Reference: Tuya MCU Protocol + Zigbee ZCL Cluster 0x000A + Community Research
const TIME_FORMATS = {
  // === EPOCH 2000 FORMATS (Zigbee ZCL Standard) ===
  ZIGBEE_2000: 'zigbee_2000',             // 4 bytes BE: seconds since 2000-01-01 UTC
  ZIGBEE_2000_LOCAL: 'zigbee_2000_local', // 4 bytes BE: seconds since 2000-01-01 LOCAL
  ZIGBEE_2000_LE: 'zigbee_2000_le',       // 4 bytes LE: seconds since 2000-01-01 UTC (some modules)

  // === EPOCH 1970 FORMATS (Unix Standard) ===
  UNIX_1970: 'unix_1970',                 // 4 bytes BE: seconds since 1970-01-01 UTC
  UNIX_1970_LOCAL: 'unix_1970_local',     // 4 bytes BE: seconds since 1970-01-01 LOCAL
  UNIX_1970_LE: 'unix_1970_le',           // 4 bytes LE: seconds since 1970-01-01 UTC
  UNIX_1970_MS: 'unix_1970_ms',           // 8 bytes BE: MILLIseconds since 1970 (data logging)

  // === 8-BYTE DUAL TIMESTAMP FORMATS ===
  TUYA_TIMESTAMP_8: 'tuya_timestamp',     // 8 bytes: [Local:4BE][UTC:4BE] epoch 2000
  TUYA_TIMESTAMP_8_UNIX: 'tuya_ts_unix',  // 8 bytes: [Local:4BE][UTC:4BE] epoch 1970

  // === DATE-STRING FORMATS (7-12 bytes) ===
  TUYA_STANDARD: 'tuya_standard',         // 7 bytes: [YY, MM, DD, HH, MM, SS, Weekday] LOCAL
  TUYA_UTC_STRING: 'tuya_utc_string',     // 7 bytes: [YY, MM, DD, HH, MM, SS, Weekday] UTC
  TUYA_MCU: 'tuya_mcu',                   // 9 bytes: [0x00, 0x08, YY, MM, DD, HH, MM, SS, Weekday]
  TUYA_EXTENDED_TZ: 'tuya_extended',      // 9 bytes: [YY, MM, DD, HH, MM, SS, Weekday, TZ_MSB, TZ_LSB]
  TUYA_FULL_TZ: 'tuya_full_tz',           // 10 bytes: [YY, MM, DD, HH, MM, SS, Weekday, TZ_hour, TZ_min, DST]

  // === SPECIAL FORMATS ===
  TUYA_GATEWAY: 'tuya_gateway',           // 12 bytes: [YYYY:2BE, MM, DD, HH, MM, SS, Weekday, TZ_h, TZ_m, DST, 0x00]
  AUTO: 'auto'                            // Auto-detect based on device type
};

// v5.5.384: Time sync command/DP identifiers
const TIME_SYNC_COMMANDS = {
  CLUSTER_TIME: 0x000A,         // Zigbee ZCL Time Cluster
  CLUSTER_TUYA: 0xEF00,         // Tuya Private Cluster (61184)
  CMD_TIME_REQUEST: 0x24,       // Tuya time request command
  CMD_TIME_RESPONSE: 0x24,      // Tuya time response command
  DP_TIME_SYNC: 0x67,           // DP 103 - Common time sync DP
  DP_TIME_FORMAT: 0x65,         // DP 101 - 12h/24h format
  DP_TIMEZONE: 0x66,            // DP 102 - Timezone setting (-12 to +12)
  DP_TIME_VALID: 0x6A           // DP 106 - Time valid flag
};

// v5.5.383: Epoch offsets - CRITICAL for correct time display
const TUYA_EPOCH_OFFSET = 946684800;    // Seconds from 1970-01-01 to 2000-01-01 (30 years)
const ZIGBEE_EPOCH_OFFSET = 946684800;  // Same as Tuya (Zigbee ZCL also uses 2000)

// v5.5.383: Common timezone offsets in minutes
const TIMEZONE_OFFSETS = {
  'UTC': 0,
  'GMT': 0,
  'GMT+1': 60,    // CET (Central European Time)
  'GMT+2': 120,   // CEST (Central European Summer Time) / EET
  'GMT+3': 180,   // MSK (Moscow)
  'GMT-5': -300,  // EST (Eastern US)
  'GMT-8': -480,  // PST (Pacific US)
  'GMT+8': 480,   // CST (China)
  'GMT+9': 540,   // JST (Japan)
  'GMT+5:30': 330 // IST (India)
};

class TuyaEF00Manager extends EventEmitter {

  constructor(device) {
    super();
    this.device = device;
    this.timeSyncDPs = [0x67, 0x01, 0x24, 0x18]; // Common time sync DPs
    this.dailySyncTimer = null;
    this.entityHandler = new LocalTuyaEntityHandler(device);
    this.detectedEntityType = null;
  }

  /**
   * v5.5.327: Safe logging helper to prevent "this.log is not a function" errors
   * @param {...any} args - Arguments to log
   */
  _log(...args) {
    if (this.device && typeof this.device.log === 'function') {
      this.device.log(...args);
    }
  }

  /**
   * v5.5.327: Safe error logging helper
   * @param {...any} args - Arguments to log
   */
  _error(...args) {
    if (this.device && typeof this.device.error === 'function') {
      this.device.error(...args);
    }
  }

  /**
   * Initialize Tuya EF00 support
   */
  async initialize(zclNode) {
    // DIAGNOSTIC MASSIF - TuyaEF00Manager
    this._log('🔍 [DIAGNOSTIC-MASSIF-TUYA] ═══════════════════════════════════════');
    this._log('🔍 [DIAGNOSTIC-MASSIF-TUYA] TuyaEF00Manager.initialize() APPELÉ');
    this._log(`🔍 [DIAGNOSTIC-MASSIF-TUYA] Device: ${this.device.getName()}`);
    this._log(`🔍 [DIAGNOSTIC-MASSIF-TUYA] zclNode: ${zclNode ? 'PRÉSENT' : 'NULL'}`);
    this._log(`🔍 [DIAGNOSTIC-MASSIF-TUYA] zclNode endpoints: ${JSON.stringify(Object.keys(zclNode?.endpoints || {}))}`);

    // Store zclNode reference
    this.zclNode = zclNode;

    // Get device identifiers for profile matching
    const model = getModelId(this.device);
    const manufacturer = getManufacturer(this.device);

    this._log(`🔍 [DIAGNOSTIC-MASSIF-TUYA] Model: ${model}, Manufacturer: ${manufacturer}`);
    this._log(`[TUYA] Initializing TuyaEF00Manager for ${model}/${manufacturer}`);

    if (!zclNode) return false;

    this._log('[TUYA] Initializing EF00 manager...');

    this._log(`[TUYA] 📋 Device: ${model} (${manufacturer})`);

    // Load centralized Tuya profile
    const profile = getTuyaProfile(model, manufacturer);
    if (profile) {
      this._log(`[TUYA] ✅ Profile loaded: ${profile.name}`);
      this._log(`[TUYA] Driver: ${profile.driver || 'auto'}`);
      this.device.setStoreValue('tuya_profile', profile.key).catch(() => { });
      this.tuyaProfile = profile;
    } else {
      this._log(`[TUYA] ⚠️  No profile for ${model}/${manufacturer} - using generic`);
    }

    // Try to get device info from database
    this.deviceInfo = getDeviceInfo(model, manufacturer);
    if (this.deviceInfo) {
      this._log(`[TUYA] ✅ Found in database: ${this.deviceInfo.name}`);
      this._log(`[TUYA]    Recommended driver: ${this.deviceInfo.driver}`);
      this._log(`[TUYA]    DPs: ${Object.keys(this.deviceInfo.dps).join(', ')}`);
    } else {
      this._log('[TUYA] ℹ️  Device not in database, using fallback mappings');
    }

    // Check if device has Tuya EF00 cluster (multiple possible names)
    const endpoint = zclNode.endpoints?.[1];
    if (!endpoint || !endpoint.clusters) {
      this._log('[TUYA] No endpoint 1 or clusters found');
      return false;
    }

    // v5.2.9: ENHANCED CLUSTER DETECTION
    // Try all possible cluster names and numeric IDs
    let tuyaCluster = endpoint.clusters.tuya
      || endpoint.clusters.tuyaManufacturer
      || endpoint.clusters.tuyaSpecific
      || endpoint.clusters.manuSpecificTuya
      || endpoint.clusters['61184']  // 0xEF00 as string
      || endpoint.clusters[61184]    // 0xEF00 as number
      || endpoint.clusters['0xEF00'] // Hex string
      || endpoint.clusters[0xEF00];  // Hex literal

    // v5.2.9: If cluster not found by name, try to bind it directly
    if (!tuyaCluster && model.toUpperCase() === 'TS0601') {
      this._log('[TUYA] 🔧 TS0601 detected but cluster not found by name, attempting direct bind...');
      this._log('[TUYA] Available clusters:', Object.keys(endpoint.clusters).join(', '));

      // Try to use the endpoint's bind method to access the cluster
      try {
        // Check if we can access via zclNode directly
        if (typeof endpoint.bind === 'function') {
          await endpoint.bind(61184).catch(() => { });
          this._log('[TUYA] ✅ Cluster 61184 bind attempted');
        }

        // Re-check for cluster after bind
        tuyaCluster = endpoint.clusters.tuya
          || endpoint.clusters['61184']
          || endpoint.clusters[61184];
      } catch (bindErr) {
        this._log('[TUYA] ⚠️ Bind attempt failed:', bindErr.message);
      }
    }

    if (!tuyaCluster) {
      // v5.2.9: For TS0601, still setup even without visible cluster
      if (model.toUpperCase() === 'TS0601') {
        this._log('[TUYA] ⚠️ TS0601 device but cluster 0xEF00 not accessible');
        this._log('[TUYA] 📋 Setting up passive DP listener mode...');
        // Store that we're in passive mode
        this.passiveMode = true;
        this.device.setStoreValue('tuya_passive_mode', true).catch(() => { });
        // Continue with setup but skip active commands
        return this._setupPassiveMode(endpoint, manufacturer);
      }

      this._log('[TUYA] ℹ️  Device uses standard Zigbee clusters (not Tuya DP protocol)');
      this._log('[TUYA] ✅ Available clusters:', Object.keys(endpoint.clusters).join(', '));
      this._log('[TUYA] ℹ️  Tuya EF00 manager not needed for this device');
      return false;
    }

    this._log('[TUYA] ✅ EF00 cluster detected');
    this.tuyaCluster = tuyaCluster; // Store for later use

    await this.sendTimeSync(zclNode);

    // Schedule daily sync at 3 AM
    this.scheduleDailySync(zclNode);

    // Listen for incoming datapoints
    this.setupDatapointListener(tuyaCluster);

    // 🆕 Request DPs from database if available, otherwise use fallback
    this._log('[TUYA] 🔍 Will request critical DPs after initialization...');
    setTimeout(async () => {
      this._log('[TUYA] 📦 NOW requesting critical DPs...');

      if (this.deviceInfo && this.deviceInfo.dps) {
        // Use database DPs
        const dpIds = Object.keys(this.deviceInfo.dps);
        this._log(`[TUYA] 📦 Requesting ${dpIds.length} DPs from database: [${dpIds.join(', ')}]`);
        for (const dpId of dpIds) {
          await this.requestDP(parseInt(dpId));
          await new Promise(resolve => setTimeout(resolve, 200)); // Space out requests
        }
      } else {
        // Fallback: request common DPs
        this._log('[TUYA] 📦 Requesting common DPs (fallback)...');
        await this.requestDP(1);  // Temperature or Motion
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.requestDP(2);  // Humidity or Sensitivity
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.requestDP(4);  // Battery %
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.requestDP(15);  // Battery % (most common)
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.requestDP(3);  // Soil temp
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.requestDP(5);  // Soil moisture
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.requestDP(9);  // Target distance
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.requestDP(101); // Sensitivity
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.requestDP(102); // Lux threshold
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.requestDP(14);  // Battery low
      }

      this._log('[TUYA] ✅ All critical DP requests sent');
      this._log('[TUYA] ℹ️  Waiting for device responses...');

      // Schedule a retry after 30s if no data received
      setTimeout(() => {
        this._log('[TUYA] 🔄 Retry: Requesting DPs again for stubborn devices...');
        if (this.deviceInfo && this.deviceInfo.dps) {
          const dpIds = Object.keys(this.deviceInfo.dps);
          dpIds.forEach(dpId => this.requestDP(parseInt(dpId)));
        } else {
          [1, 2, 4, 15].forEach(dp => this.requestDP(dp)); // Most critical DPs
        }
      }, 30000);
    }, 5000); // Wait 5s for device to be fully ready (increased from 3s)

    return true;
  }

  /**
   * v5.2.9: Setup passive mode for TS0601 devices where cluster isn't accessible
   * This mode listens for incoming DP reports without sending active requests
   */
  async _setupPassiveMode(endpoint, manufacturer) {
    this._log('[TUYA-PASSIVE] Setting up passive DP listener mode...');
    this._log('[TUYA-PASSIVE] Manufacturer:', manufacturer);

    // v5.2.14: Comprehensive DP mappings for common TS0601 devices
    const PASSIVE_DP_MAPPINGS = {
      // Presence radars
      '_TZE200_rhgsbacq': {
        1: { capability: 'alarm_motion', parser: (v) => Boolean(v) },
        4: { capability: 'measure_battery', parser: (v) => v },
        9: { capability: 'radar_sensitivity', parser: (v) => v },
        12: { capability: 'target_distance', parser: (v) => v / 100 }, // cm to m
        15: { capability: 'measure_battery', parser: (v) => v },
        101: { capability: 'radar_sensitivity', parser: (v) => v },
        102: { capability: 'illuminance_threshold', parser: (v) => v },
        103: { capability: 'measure_luminance', parser: (v) => v },
        104: { capability: 'fading_time', parser: (v) => v },
      },
      '_TZE200_3towulqd': {
        1: { capability: 'alarm_motion', parser: (v) => Boolean(v) },
        3: { capability: 'measure_temperature', parser: (v) => v / 10 },
        4: { capability: 'measure_humidity', parser: (v) => v },
        9: { capability: 'measure_luminance', parser: (v) => v },
        15: { capability: 'measure_battery', parser: (v) => v },
      },
      '_TZE200_a8sdabtg': { // Soil sensor
        1: { capability: 'measure_temperature', parser: (v) => v / 10 },
        2: { capability: 'measure_humidity', parser: (v) => v },
        3: { capability: 'measure_temperature', parser: (v) => v / 10 }, // soil temp
        4: { capability: 'measure_battery', parser: (v) => v },
        5: { capability: 'measure_humidity', parser: (v) => v }, // soil moisture
        15: { capability: 'measure_battery', parser: (v) => v },
      },
      // v5.2.70: Soil sensor _TZE284_oitavov2 (from diagnostic report)
      '_TZE284_oitavov2': {
        1: { capability: 'measure_temperature', parser: (v) => v / 10 },  // Air temp
        2: { capability: 'measure_humidity', parser: (v) => v },          // Air humidity
        3: { capability: 'measure_temperature', parser: (v) => v / 10 },  // Soil temp
        4: { capability: 'measure_humidity', parser: (v) => v },          // Soil moisture
        14: { capability: 'measure_battery', parser: (v) => v },
        15: { capability: 'measure_battery', parser: (v) => v },
      },
      // v5.3.45: Climate sensor ZTH05Z variants - FIXED DP mappings from Zigbee2MQTT
      // Source: github.com/Koenkk/zigbee-herdsman-converters/src/devices/tuya.ts
      '_TZE284_vvmbj46n': {
        1: { capability: 'measure_temperature', parser: (v) => v / 10 },  // Temperature (÷10)
        2: { capability: 'measure_humidity', parser: (v) => v },          // Humidity (%) - NOT ÷10!
        4: { capability: 'measure_battery', parser: (v) => v },           // Battery (%)
        9: { type: 'setting', name: 'temp_unit' },                        // Temperature unit (0=C, 1=F)
        10: { type: 'setting', name: 'max_temp_alarm' },                  // Max temp alarm
        11: { type: 'setting', name: 'min_temp_alarm' },                  // Min temp alarm
        12: { type: 'setting', name: 'max_humidity_alarm' },              // Max humidity alarm
        13: { type: 'setting', name: 'min_humidity_alarm' },              // Min humidity alarm
        14: { type: 'setting', name: 'temp_alarm_state' },                // Temp alarm state
        15: { capability: 'measure_battery', parser: (v) => v },          // Battery (alt) / humidity alarm
        17: { type: 'setting', name: 'temp_report_interval' },            // Temp report interval (min)
        18: { type: 'setting', name: 'hum_report_interval' },             // Humidity report interval
        19: { type: 'setting', name: 'temp_sensitivity' },                // Temp sensitivity (÷10)
        20: { type: 'setting', name: 'hum_sensitivity' },                 // Humidity sensitivity
      },
      '_TZE200_vvmbj46n': {
        1: { capability: 'measure_temperature', parser: (v) => v / 10 },  // Temperature (÷10)
        2: { capability: 'measure_humidity', parser: (v) => v },          // Humidity (%)
        4: { capability: 'measure_battery', parser: (v) => v },           // Battery (%)
        15: { capability: 'measure_battery', parser: (v) => v },          // Battery (alt)
      },
      '_TZE200_upagmta9': {
        1: { capability: 'measure_temperature', parser: (v) => v / 10 },
        2: { capability: 'measure_humidity', parser: (v) => v },
        4: { capability: 'measure_battery', parser: (v) => v },
      },
      '_TZE204_upagmta9': {
        1: { capability: 'measure_temperature', parser: (v) => v / 10 },
        2: { capability: 'measure_humidity', parser: (v) => v },
        4: { capability: 'measure_battery', parser: (v) => v },
      },
      // v5.2.90: Radar presence sensor _TZE200_rhgsbacq
      '_TZE200_rhgsbacq': {
        1: { capability: 'alarm_motion', parser: (v) => Boolean(v) },     // Presence
        4: { capability: 'measure_battery', parser: (v) => v },           // Battery (%)
        12: { capability: 'measure_luminance', parser: (v) => v },        // Illuminance (lux)
        101: { type: 'setting', name: 'presence_time' },                  // Presence timeout
        102: { type: 'setting', name: 'leave_time' },                     // Leave timeout
      },
      // PIR sensors
      '_TZE200_ppuj1vem': {
        1: { capability: 'alarm_motion', parser: (v) => Boolean(v) },
        4: { capability: 'measure_battery', parser: (v) => v },
        9: { capability: 'pir_sensitivity', parser: (v) => v },
        101: { capability: 'measure_luminance', parser: (v) => v },
        102: { capability: 'pir_time', parser: (v) => v },
      },
      // USB outlets (mains powered)
      '_TZ3000_u3oupgdy': {
        1: { capability: 'onoff', parser: (v) => Boolean(v) },
        101: { capability: 'onoff.gang2', parser: (v) => Boolean(v) },
        102: { capability: 'onoff.usb', parser: (v) => Boolean(v) },
      },
      // Generic fallback for unknown TS0601
      '_generic': {
        1: { capability: 'alarm_motion', parser: (v) => Boolean(v) },
        2: { capability: 'measure_humidity', parser: (v) => v },
        3: { capability: 'measure_temperature', parser: (v) => v / 10 },
        4: { capability: 'measure_battery', parser: (v) => v },
        5: { capability: 'measure_humidity', parser: (v) => v }, // soil moisture
        15: { capability: 'measure_battery', parser: (v) => v },
        101: { capability: 'onoff.gang2', parser: (v) => Boolean(v) },
        102: { capability: 'onoff.usb', parser: (v) => Boolean(v) },
        103: { capability: 'measure_luminance', parser: (v) => v },
      }
    };

    // Find matching DP mappings
    let dpMappings = null;
    for (const [mfr, mappings] of Object.entries(PASSIVE_DP_MAPPINGS)) {
      if (mfr !== '_generic' && manufacturer.startsWith(mfr)) {
        dpMappings = mappings;
        this._log(`[TUYA-PASSIVE] ✅ Found DP mappings for ${mfr}`);
        break;
      }
    }

    if (!dpMappings) {
      dpMappings = PASSIVE_DP_MAPPINGS['_generic'];
      this._log('[TUYA-PASSIVE] Using generic DP mappings');
    }

    this.dpMappings = dpMappings;

    // Setup ZCL raw frame listener via endpoint
    // This catches incoming frames even when cluster isn't properly initialized
    try {
      // Listen for raw ZCL frames on endpoint 1
      if (endpoint && typeof endpoint.on === 'function') {
        endpoint.on('zcl', (frame) => {
          this._handlePassiveFrame(frame);
        });
        this._log('[TUYA-PASSIVE] ✅ ZCL frame listener registered');
      }

      // Also try to listen on any visible clusters
      for (const [clusterName, cluster] of Object.entries(endpoint.clusters || {})) {
        if (cluster && typeof cluster.on === 'function') {
          cluster.on('data', (data) => {
            this._log(`[TUYA-PASSIVE] Data from cluster ${clusterName}:`, JSON.stringify(data));
            this._handlePassiveData(data);
          });
          cluster.on('dataReport', (data) => {
            this._log(`[TUYA-PASSIVE] DataReport from cluster ${clusterName}:`, JSON.stringify(data));
            this._handlePassiveData(data);
          });
        }
      }

      this._log('[TUYA-PASSIVE] ✅ Passive mode configured');
      this._log('[TUYA-PASSIVE] ℹ️ Device will report data when it wakes up');
      this._log('[TUYA-PASSIVE] ℹ️ Battery devices may take up to 24h for first report');

      return true;
    } catch (err) {
      this._error('[TUYA-PASSIVE] Failed to setup passive mode:', err.message);
      return false;
    }
  }

  /**
   * Handle raw ZCL frame in passive mode
   */
  _handlePassiveFrame(frame) {
    try {
      if (!frame || !frame.data) return;

      this._log('[TUYA-PASSIVE] 📦 Raw frame received:', frame);

      // Try to parse as Tuya DP frame
      const data = frame.data;
      if (data.length >= 4) {
        const dp = data[0];
        const type = data[1];
        const len = (data[2] << 8) | data[3];
        const value = data.slice(4, 4 + len);

        this._log(`[TUYA-PASSIVE] DP ${dp}, type ${type}, len ${len}, value:`, value);

        // Parse value based on type
        let parsedValue;
        if (type === 0x01) { // Bool
          parsedValue = value[0] !== 0;
        } else if (type === 0x02) { // Value (4-byte big-endian)
          parsedValue = value.readUInt32BE ? value.readUInt32BE(0) :
            (value[0] << 24) | (value[1] << 16) | (value[2] << 8) | value[3];
        } else if (type === 0x04) { // Enum
          parsedValue = value[0];
        } else {
          parsedValue = value;
        }

        this._applyDPValue(dp, parsedValue);
      }
    } catch (err) {
      this._error('[TUYA-PASSIVE] Frame parse error:', err.message);
    }
  }

  /**
   * Handle data in passive mode
   */
  _handlePassiveData(data) {
    try {
      if (!data) return;

      const dp = data.dpId || data.dp;
      const value = data.dpValue ?? data.data ?? data.value;

      if (dp !== undefined && value !== undefined) {
        this._applyDPValue(dp, value);
      }
    } catch (err) {
      this._error('[TUYA-PASSIVE] Data parse error:', err.message);
    }
  }

  /**
   * Apply DP value to capability
   * v5.2.14: Enhanced to emit ALL required events for drivers and BatteryManager
   */
  _applyDPValue(dp, value) {
    const mapping = this.dpMappings ? this.dpMappings[dp] : null;

    this._log(`[TUYA-PASSIVE] 📥 Processing DP${dp} = ${JSON.stringify(value)}`);

    // v5.2.14: Store last data received for KPI
    this.device.setStoreValue('last_data_received', Date.now()).catch(() => { });
    this.device.setStoreValue(`dp_${dp}_value`, value).catch(() => { });
    this.device.setStoreValue(`dp_${dp}_timestamp`, Date.now()).catch(() => { });

    // v5.2.14: Emit ALL events that handlers might be listening to
    // This ensures compatibility with all listener patterns
    this.emit(`dp-${dp}`, value);
    this.emit('datapoint', { dp, value, dpType: 'passive' });

    // CRITICAL: Emit dpReport which is what drivers listen for
    this.emit('dpReport', {
      device: this.device,
      dpId: dp,
      dpType: 'passive',
      value: value,
      timestamp: Date.now()
    });

    // v5.2.14: Forward battery DPs to BatteryManager
    const batteryDPs = [4, 14, 15, 33, 35, 10, 101];
    if (batteryDPs.includes(dp)) {
      this._forwardToBatteryManager(dp, value);
    }

    // v5.3.15: Handle DP 247 for voltage (common on USB/mains devices)
    if (dp === 247 && this.device.hasCapability?.('measure_voltage')) {
      try {
        // DP 247 is usually mV, convert to V
        const voltage = typeof value === 'number' ? value / 1000 :
          (Buffer.isBuffer(value) ? value.readUInt16BE(0) / 1000 : 0);
        if (voltage > 0 && voltage < 300) { // Sanity check
          this._log(`[TUYA] ⚡ Voltage DP247: ${voltage}V`);
          this.device.setCapabilityValue('measure_voltage', parseFloat(voltage)).catch(() => { });
        }
      } catch (e) {
        this._log('[TUYA] DP247 voltage parse error:', e.message);
      }
    }

    if (mapping) {
      const { capability, parser } = mapping;
      const parsedValue = parser ? parser(value) : value;

      this._log(`[TUYA-PASSIVE] ✅ DP${dp} → ${capability} = ${parsedValue}`);

      // Add capability if missing
      if (!this.device.hasCapability(capability)) {
        this.device.addCapability(capability).catch(err => {
          this._log(`[TUYA-PASSIVE] Cannot add ${capability}: ${err.message}`);
        });
      }

      // Set value
      this.device.setCapabilityValue(capability, parsedValue).catch(err => {
        this._error(`[TUYA-PASSIVE] Failed to set ${capability}:`, err.message);
      });
    } else {
      this._log(`[TUYA-PASSIVE] ℹ️ Unknown DP${dp} - stored for debugging`);
      // Store unknown DPs for debugging
      if (this.device.setStoreValue) {
        this.device.setStoreValue(`unknown_dp_${dp}`, value).catch(() => { });
      }
    }
  }

  /**
   * v5.5.383: BUILD TIME PAYLOAD - COMPREHENSIVE time format support
   * Creates payload buffer based on the specified time format
   * Handles ALL epoch types (1970/2000) and ALL timezone/DST combinations
   *
   * @param {string} format - One of TIME_FORMATS values
   * @param {Object} options - Additional options
   * @returns {Buffer} - The time sync payload
   */
  _buildTimePayload(format, options = {}) {
    const now = new Date();
    const {
      useLocalTime = true,      // Use local time for "dumb" devices
      timezoneMinutes = -now.getTimezoneOffset(), // GMT offset in minutes (GMT+1 = 60)
      includeDST = true         // Include DST flag where applicable
    } = options;

    // === CALCULATE ALL TIMESTAMPS ===
    const unixTimestampUtc = Math.floor(now.getTime() / 1000);
    const timezoneOffsetSec = timezoneMinutes * 60;

    // Unix epoch (1970) timestamps
    const unix1970Utc = unixTimestampUtc;
    const unix1970Local = unixTimestampUtc + timezoneOffsetSec;

    // Tuya/Zigbee epoch (2000) timestamps
    const tuya2000Utc = unixTimestampUtc - TUYA_EPOCH_OFFSET;
    const tuya2000Local = tuya2000Utc + timezoneOffsetSec;

    // === DATE COMPONENTS ===
    // Local time components (for devices that display what they receive)
    const localDate = new Date(now.getTime());
    // UTC time components
    const utcDate = new Date(now.getTime());

    // Weekday: Tuya uses 1=Monday to 7=Sunday, JS uses 0=Sunday to 6=Saturday
    const weekdayLocal = localDate.getDay() === 0 ? 7 : localDate.getDay();
    const weekdayUtc = utcDate.getUTCDay() === 0 ? 7 : utcDate.getUTCDay();

    // DST detection (crude but effective)
    const isDST = this._isDaylightSavingTime(now);
    const dstFlag = isDST ? 1 : 0;

    // Timezone hour and minute components
    const tzHours = Math.floor(Math.abs(timezoneMinutes) / 60) * (timezoneMinutes >= 0 ? 1 : -1);
    const tzMins = Math.abs(timezoneMinutes) % 60;

    this._log(`[TIME] 🕒 Building payload: format=${format}, TZ=GMT${timezoneMinutes >= 0 ? '+' : ''}${tzHours}:${tzMins.toString().padStart(2, '0')}, DST=${isDST}`);

    switch (format) {
      // === EPOCH 2000 FORMATS ===
      case TIME_FORMATS.ZIGBEE_2000:
        // 4 bytes Big-Endian: seconds since 2000-01-01 UTC
        const zb2000 = Buffer.alloc(4);
        zb2000.writeUInt32BE(tuya2000Utc, 0);
        return zb2000;

      case TIME_FORMATS.ZIGBEE_2000_LOCAL:
        // 4 bytes Big-Endian: seconds since 2000-01-01 LOCAL
        const zb2000L = Buffer.alloc(4);
        zb2000L.writeUInt32BE(tuya2000Local, 0);
        return zb2000L;

      case TIME_FORMATS.ZIGBEE_2000_LE:
        // 4 bytes Little-Endian: seconds since 2000-01-01 UTC (some modules)
        const zb2000LE = Buffer.alloc(4);
        zb2000LE.writeUInt32LE(tuya2000Utc, 0);
        return zb2000LE;

      // === EPOCH 1970 FORMATS ===
      case TIME_FORMATS.UNIX_1970:
        // 4 bytes Big-Endian: seconds since 1970-01-01 UTC
        const unix1970 = Buffer.alloc(4);
        unix1970.writeUInt32BE(unix1970Utc, 0);
        return unix1970;

      case TIME_FORMATS.UNIX_1970_LOCAL:
        // 4 bytes Big-Endian: seconds since 1970-01-01 LOCAL
        const unix1970L = Buffer.alloc(4);
        unix1970L.writeUInt32BE(unix1970Local, 0);
        return unix1970L;

      case TIME_FORMATS.UNIX_1970_LE:
        // 4 bytes Little-Endian: seconds since 1970-01-01 UTC
        const unix1970LE = Buffer.alloc(4);
        unix1970LE.writeUInt32LE(unix1970Utc, 0);
        return unix1970LE;

      case TIME_FORMATS.UNIX_1970_MS:
        // 8 bytes Big-Endian: MILLIseconds since 1970-01-01 UTC (data logging)
        const unixMs = Buffer.alloc(8);
        const msTimestamp = BigInt(now.getTime());
        unixMs.writeBigUInt64BE(msTimestamp, 0);
        return unixMs;

      // === 8-BYTE TIMESTAMP FORMATS ===
      case TIME_FORMATS.TUYA_TIMESTAMP_8:
        // 8 bytes: [Local:4BE][UTC:4BE] - Epoch 2000 for LCD climate sensors
        const ts8_2000 = Buffer.alloc(8);
        ts8_2000.writeUInt32BE(tuya2000Local, 0);  // Local time FIRST
        ts8_2000.writeUInt32BE(tuya2000Utc, 4);    // UTC time SECOND
        return ts8_2000;

      case TIME_FORMATS.TUYA_TIMESTAMP_8_UNIX:
        // 8 bytes: [Local:4BE][UTC:4BE] - Epoch 1970
        const ts8_1970 = Buffer.alloc(8);
        ts8_1970.writeUInt32BE(unix1970Local, 0);  // Local time FIRST
        ts8_1970.writeUInt32BE(unix1970Utc, 4);    // UTC time SECOND
        return ts8_1970;

      // === DATE-STRING FORMATS ===
      case TIME_FORMATS.TUYA_STANDARD:
        // 7 bytes: [YY, MM, DD, HH, MM, SS, Weekday] - LOCAL time
        return Buffer.from([
          localDate.getFullYear() - 2000,
          localDate.getMonth() + 1,
          localDate.getDate(),
          localDate.getHours(),
          localDate.getMinutes(),
          localDate.getSeconds(),
          weekdayLocal
        ]);

      case TIME_FORMATS.TUYA_UTC_STRING:
        // 7 bytes: [YY, MM, DD, HH, MM, SS, Weekday] - UTC time
        return Buffer.from([
          utcDate.getUTCFullYear() - 2000,
          utcDate.getUTCMonth() + 1,
          utcDate.getUTCDate(),
          utcDate.getUTCHours(),
          utcDate.getUTCMinutes(),
          utcDate.getUTCSeconds(),
          weekdayUtc
        ]);

      case TIME_FORMATS.TUYA_MCU:
        // 9 bytes: [Type=0x00, Len=0x07, YY, MM, DD, HH, MM, SS, Weekday]
        return Buffer.from([
          0x00,  // Type
          0x07,  // Length of following data (7 bytes)
          localDate.getFullYear() - 2000,
          localDate.getMonth() + 1,
          localDate.getDate(),
          localDate.getHours(),
          localDate.getMinutes(),
          localDate.getSeconds(),
          weekdayLocal
        ]);

      case TIME_FORMATS.TUYA_EXTENDED_TZ:
        // 9 bytes: [YY, MM, DD, HH, MM, SS, Weekday, TZ_MSB, TZ_LSB]
        const extTz = Buffer.alloc(9);
        extTz.writeUInt8(localDate.getFullYear() - 2000, 0);
        extTz.writeUInt8(localDate.getMonth() + 1, 1);
        extTz.writeUInt8(localDate.getDate(), 2);
        extTz.writeUInt8(localDate.getHours(), 3);
        extTz.writeUInt8(localDate.getMinutes(), 4);
        extTz.writeUInt8(localDate.getSeconds(), 5);
        extTz.writeUInt8(weekdayLocal, 6);
        extTz.writeInt16BE(timezoneMinutes, 7); // Signed 16-bit timezone minutes
        return extTz;

      case TIME_FORMATS.TUYA_FULL_TZ:
        // 10 bytes: [YY, MM, DD, HH, MM, SS, Weekday, TZ_hour, TZ_min, DST]
        // Full timezone info with DST flag
        return Buffer.from([
          localDate.getFullYear() - 2000,
          localDate.getMonth() + 1,
          localDate.getDate(),
          localDate.getHours(),
          localDate.getMinutes(),
          localDate.getSeconds(),
          weekdayLocal,
          tzHours & 0xFF,  // Timezone hours (signed byte)
          tzMins,          // Timezone minutes
          dstFlag          // DST active flag
        ]);

      case TIME_FORMATS.TUYA_GATEWAY:
        // 12 bytes: Gateway format with full year [YYYY_MSB, YYYY_LSB, MM, DD, HH, MM, SS, Weekday, TZ_hour, TZ_min, DST, 0x00]
        const gwBuf = Buffer.alloc(12);
        gwBuf.writeUInt16BE(localDate.getFullYear(), 0);  // Full year
        gwBuf.writeUInt8(localDate.getMonth() + 1, 2);
        gwBuf.writeUInt8(localDate.getDate(), 3);
        gwBuf.writeUInt8(localDate.getHours(), 4);
        gwBuf.writeUInt8(localDate.getMinutes(), 5);
        gwBuf.writeUInt8(localDate.getSeconds(), 6);
        gwBuf.writeUInt8(weekdayLocal, 7);
        gwBuf.writeInt8(tzHours, 8);
        gwBuf.writeUInt8(tzMins, 9);
        gwBuf.writeUInt8(dstFlag, 10);
        gwBuf.writeUInt8(0x00, 11);  // Reserved
        return gwBuf;

      default:
        // Default: TUYA_TIMESTAMP_8 (most common for LCD devices)
        const defaultTs = Buffer.alloc(8);
        defaultTs.writeUInt32BE(tuya2000Local, 0);
        defaultTs.writeUInt32BE(tuya2000Utc, 4);
        return defaultTs;
    }
  }

  /**
   * v5.5.383: Detect if currently in Daylight Saving Time
   * @param {Date} date - Date to check
   * @returns {boolean} - True if DST is active
   */
  _isDaylightSavingTime(date) {
    const jan = new Date(date.getFullYear(), 0, 1);
    const jul = new Date(date.getFullYear(), 6, 1);
    const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
    return date.getTimezoneOffset() < stdOffset;
  }

  /**
   * v5.5.383: Get timezone string from minutes offset
   * @param {number} minutes - Timezone offset in minutes
   * @returns {string} - Timezone string like "GMT+1" or "GMT-5"
   */
  _getTimezoneString(minutes) {
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.abs(minutes) % 60;
    const sign = minutes >= 0 ? '+' : '-';
    if (mins === 0) {
      return `GMT${sign}${hours}`;
    }
    return `GMT${sign}${hours}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * v5.5.383: AUTO-DETECT TIME FORMAT based on device type
   * Comprehensive detection for all known Tuya/Zigbee device types
   * @returns {string} - The recommended TIME_FORMATS value
   */
  _detectTimeFormat() {
    const manufacturer = this.device.getData()?.manufacturerName || '';
    const model = this.device.getData()?.productId || '';
    const driverClass = this.device.driver?.manifest?.class || '';
    const combined = `${manufacturer}_${model}`.toLowerCase();

    // === LCD CLIMATE SENSORS (TZE200/TZE284 with display) ===
    // These need TUYA_TIMESTAMP_8 (8-byte dual timestamp, epoch 2000)
    if (combined.includes('_tze284_') || combined.includes('_tze200_')) {
      if (combined.includes('temp') || combined.includes('climate') ||
        combined.includes('humid') || combined.includes('th') ||
        combined.includes('lcd') || combined.includes('display')) {
        return TIME_FORMATS.TUYA_TIMESTAMP_8;
      }
    }

    // === THERMOSTATS & TRVs (MCU-based) ===
    // These typically need TUYA_MCU format (9-byte with header)
    if (combined.includes('thermostat') || combined.includes('trv') ||
      combined.includes('radiator') || combined.includes('valve') ||
      combined.includes('heating') || driverClass === 'thermostat') {
      return TIME_FORMATS.TUYA_MCU;
    }

    // === GATEWAY/HUB DEVICES ===
    // Use extended 12-byte format with full year
    if (combined.includes('gateway') || combined.includes('hub') ||
      combined.includes('bridge') || combined.includes('coordinator')) {
      return TIME_FORMATS.TUYA_GATEWAY;
    }

    // === SOIL/PLANT SENSORS (often need Unix epoch) ===
    if (combined.includes('soil') || combined.includes('plant') ||
      combined.includes('moisture')) {
      return TIME_FORMATS.UNIX_1970;
    }

    // === STANDARD ZIGBEE (non-Tuya manufacturers) ===
    // Use Zigbee 2000 epoch (ZCL standard)
    if (!manufacturer.startsWith('_T') && !manufacturer.startsWith('_tZ')) {
      return TIME_FORMATS.ZIGBEE_2000;
    }

    // === TZE204 SERIES (often need extended timezone) ===
    if (combined.includes('_tze204_')) {
      return TIME_FORMATS.TUYA_EXTENDED_TZ;
    }

    // === PRESENCE/RADAR SENSORS ===
    if (combined.includes('presence') || combined.includes('radar') ||
      combined.includes('mmwave') || combined.includes('pir')) {
      return TIME_FORMATS.TUYA_STANDARD;
    }

    // === PLUGS/SWITCHES WITH SCHEDULES ===
    // These often need full timezone info for scheduling
    if (combined.includes('schedule') || combined.includes('timer') ||
      driverClass === 'socket' || driverClass === 'light') {
      return TIME_FORMATS.TUYA_FULL_TZ;
    }

    // === DEFAULT: TUYA_STANDARD (most common) ===
    return TIME_FORMATS.TUYA_STANDARD;
  }

  /**
   * v5.5.383: Get list of formats to try for a device type
   * Used for fallback when primary format fails
   * @returns {string[]} - Array of TIME_FORMATS to try in order
   */
  _getTimeFormatFallbacks() {
    const primary = this._detectTimeFormat();
    const fallbacks = [primary];

    // Add fallback formats based on primary
    switch (primary) {
      case TIME_FORMATS.TUYA_TIMESTAMP_8:
        fallbacks.push(TIME_FORMATS.TUYA_TIMESTAMP_8_UNIX);
        fallbacks.push(TIME_FORMATS.TUYA_STANDARD);
        break;
      case TIME_FORMATS.TUYA_MCU:
        fallbacks.push(TIME_FORMATS.TUYA_STANDARD);
        fallbacks.push(TIME_FORMATS.TUYA_EXTENDED_TZ);
        break;
      case TIME_FORMATS.ZIGBEE_2000:
        fallbacks.push(TIME_FORMATS.ZIGBEE_2000_LOCAL);
        fallbacks.push(TIME_FORMATS.UNIX_1970);
        break;
      case TIME_FORMATS.UNIX_1970:
        fallbacks.push(TIME_FORMATS.UNIX_1970_LOCAL);
        fallbacks.push(TIME_FORMATS.ZIGBEE_2000);
        break;
      default:
        fallbacks.push(TIME_FORMATS.TUYA_TIMESTAMP_8);
        fallbacks.push(TIME_FORMATS.ZIGBEE_2000);
    }

    return fallbacks;
  }

  /**
   * v5.5.384: INTERCEPT TIME REQUESTS - Auto-respond to device time sync requests
   * Devices request time via:
   * - Cluster 0x000A (Time Cluster) read attribute
   * - Cluster 0xEF00 command 0x24 (Tuya time request)
   * - Empty DP report on DP 0x67 or similar
   *
   * @param {Object} zclNode - The ZCL node
   * @param {Object} options - Options for time request handling
   */
  setupTimeRequestListener(zclNode, options = {}) {
    if (!zclNode) return;

    const {
      autoRespond = true,         // Automatically respond to time requests
      timeFormat = TIME_FORMATS.AUTO,
      logPrefix = '[TIME-LISTEN]'
    } = options;

    try {
      // Find Tuya cluster on endpoint 1
      const endpoint = zclNode.endpoints?.[1];
      if (!endpoint) return;

      const tuyaCluster = endpoint.clusters?.tuya
        || endpoint.clusters?.manuSpecificTuya
        || endpoint.clusters?.[0xEF00]
        || endpoint.clusters?.[61184];

      if (tuyaCluster && typeof tuyaCluster.on === 'function') {
        // Listen for Tuya time request (cmd 0x24)
        tuyaCluster.on('response', (status, transId, dp, dataType, data) => {
          // Check if this is a time request (empty data or specific DP)
          if (dp === TIME_SYNC_COMMANDS.CMD_TIME_REQUEST ||
            dp === TIME_SYNC_COMMANDS.DP_TIME_SYNC) {
            this._log(`${logPrefix} 📥 Time request detected: DP=${dp}, transId=${transId}`);
            if (autoRespond) {
              this.sendTimeSync(zclNode, { timeFormat, forceSync: true });
            }
            this.emit('timeRequest', { dp, transId, dataType, data });
          }
        });

        // Listen for dataReport events (some devices use this)
        tuyaCluster.on('dataReport', (data) => {
          if (data && (data.dp === TIME_SYNC_COMMANDS.DP_TIME_SYNC ||
            data.commandId === TIME_SYNC_COMMANDS.CMD_TIME_REQUEST)) {
            this._log(`${logPrefix} 📥 Time dataReport request detected`);
            if (autoRespond) {
              this.sendTimeSync(zclNode, { timeFormat, forceSync: true });
            }
            this.emit('timeRequest', data);
          }
        });

        this._log(`${logPrefix} ✅ Time request listener active on cluster 0xEF00`);
      }

      // Also check for standard Zigbee Time Cluster (0x000A)
      const timeCluster = endpoint.clusters?.time || endpoint.clusters?.[0x000A];
      if (timeCluster && typeof timeCluster.on === 'function') {
        timeCluster.on('read', (attributes) => {
          this._log(`${logPrefix} 📥 ZCL Time Cluster read request: ${JSON.stringify(attributes)}`);
          if (autoRespond) {
            this.sendTimeSync(zclNode, {
              timeFormat: TIME_FORMATS.ZIGBEE_2000,
              forceSync: true
            });
          }
          this.emit('timeRequest', { cluster: 'time', attributes });
        });
        this._log(`${logPrefix} ✅ Time request listener active on cluster 0x000A`);
      }

    } catch (err) {
      this._log(`${logPrefix} ⚠️ Failed to setup time listener: ${err.message}`);
    }
  }

  /**
   * v5.5.384: Check if a message is a time sync request
   * @param {number} dp - Datapoint ID
   * @param {number} commandId - Command ID
   * @param {Buffer} data - Data payload
   * @returns {boolean} - True if this is a time request
   */
  isTimeRequest(dp, commandId, data) {
    // Time request indicators:
    // 1. Command 0x24 (Tuya time sync command)
    // 2. DP 0x67 (103) with empty or minimal data
    // 3. DP 0x18 (24) time request
    if (commandId === TIME_SYNC_COMMANDS.CMD_TIME_REQUEST) return true;
    if (dp === TIME_SYNC_COMMANDS.DP_TIME_SYNC) return true;
    if (dp === 0x18 && (!data || data.length === 0)) return true;
    return false;
  }

  /**
   * v5.5.384: COMPREHENSIVE TIME SYNC - Universal time synchronization
   * Reference: https://github.com/Koenkk/zigbee2mqtt/issues/30054
   *
   * SUPPORTS ALL TIME FORMATS:
   * - ZIGBEE_2000/LOCAL/LE: Standard Zigbee (4 bytes, seconds since 2000)
   * - UNIX_1970/LOCAL/LE/MS: Unix epoch (4-8 bytes, seconds/ms since 1970)
   * - TUYA_STANDARD/UTC_STRING: 7 bytes [YY, MM, DD, HH, MM, SS, Weekday]
   * - TUYA_MCU: 9 bytes with header [Type, Len, YY, MM, DD, HH, MM, SS, Weekday]
   * - TUYA_EXTENDED_TZ: 9 bytes with timezone
   * - TUYA_FULL_TZ: 10 bytes with DST flag
   * - TUYA_TIMESTAMP_8: 8 bytes [Local:4BE][UTC:4BE] for LCD climate sensors
   * - TUYA_GATEWAY: 12 bytes full gateway format
   */
  async sendTimeSync(zclNode, options = {}) {
    if (!zclNode) return false;

    // v5.5.382: Enhanced parameters with time format support
    const {
      forceSync = false,           // BYPASS all conditions - FORCE sync
      timeFormat = TIME_FORMATS.AUTO, // Time format to use (auto-detect if not specified)
      useLocalTime = true,         // Use local time for "dumb" devices
      timezoneMinutes = null,      // Override timezone (null = auto from system)
      useTuyaEpoch = true,         // Use Tuya epoch (2000) - kept for backward compat
      sendTimeValidDP = false,     // Send DP 0x65/0x66/0x6A to enable LCD display
      logPrefix = '[TUYA]'         // Custom log prefix
    } = options;

    // v5.5.206: Multi-endpoint discovery for LCD climate sensors
    const targetEndpoint = options.endpointId || this._findTimeEndpoint(zclNode);
    const endpoint = zclNode.endpoints?.[targetEndpoint];
    const tuyaCluster = endpoint?.clusters?.tuyaManufacturer
      || endpoint?.clusters?.tuyaSpecific
      || endpoint?.clusters?.manuSpecificTuya
      || endpoint?.clusters?.[0xEF00];
    if (!tuyaCluster) return false;

    try {
      const now = new Date();

      // v5.5.382: Determine time format (auto-detect or use specified)
      const actualFormat = timeFormat === TIME_FORMATS.AUTO
        ? this._detectTimeFormat()
        : timeFormat;

      // v5.5.382: Calculate timezone
      const actualTzMinutes = timezoneMinutes !== null
        ? timezoneMinutes
        : -now.getTimezoneOffset(); // JS getTimezoneOffset is inverted

      // v5.5.382: Build payload using the comprehensive builder
      const payload = this._buildTimePayload(actualFormat, {
        useLocalTime,
        timezoneMinutes: actualTzMinutes
      });

      this._log(`${logPrefix} 🕒 Time sync format: ${actualFormat}`);
      this._log(`${logPrefix} 🕒 Payload: ${payload.toString('hex')} (${payload.length} bytes)`);
      this._log(`${logPrefix} 🕒 Timezone: GMT${actualTzMinutes >= 0 ? '+' : ''}${actualTzMinutes / 60}`);
      this._log(`${logPrefix} 🕒 Local time: ${now.toLocaleString()}`);

      // v5.5.382: Determine datatype based on format
      const datatype = (actualFormat === TIME_FORMATS.TUYA_TIMESTAMP_8) ? 0x0C : 0x00;

      this._log(`${logPrefix} Sending time sync:`, {
        date: now.toISOString(),
        format: actualFormat,
        payload: payload.toString('hex'),
        timezone: `GMT${actualTzMinutes >= 0 ? '+' : ''}${actualTzMinutes / 60}`,
        forceSync: forceSync,
        sendTimeValidDP: sendTimeValidDP,
        endpoint: targetEndpoint
      });

      // v5.5.382: Enhanced frame building with comprehensive format support
      const sendFrame = async (attempt = 1) => {
        try {
          if (!endpoint) {
            this._log(`[TUYA] No endpoint ${targetEndpoint}`);
            return false;
          }

          // Build Tuya frame with proper header
          const dp = 0x24; // Time sync DP
          const seq = Math.floor(Math.random() * 0xFFFF);

          const frame = Buffer.alloc(4 + payload.length);
          frame.writeUInt8(dp, 0);
          frame.writeUInt8(datatype, 1);
          frame.writeUInt16BE(payload.length, 2);
          payload.copy(frame, 4);

          this._log(`${logPrefix} 📤 Sending time sync attempt ${attempt} on EP${targetEndpoint}:`, frame.toString('hex'));

          // v5.3.29: FIX - Use correct SDK3 method (command vs non-existent dataRequest)
          // SDK3 Tuya cluster exposes: setData, getData, dataReport, dataResponse
          if (typeof tuyaCluster.setData === 'function') {
            await tuyaCluster.setData({
              status: 0,
              transid: seq & 0xFF,
              dp: dp,
              datatype: datatype,
              length_hi: 0,
              length_lo: payload.length,
              data: payload
            });
            this._log(`${logPrefix} ✅ Time sync attempt ${attempt} sent via setData`);
            return true;
          }

          // Method 2: Try command('setData') pattern
          if (typeof tuyaCluster.command === 'function') {
            await tuyaCluster.command('setData', {
              status: 0,
              transid: seq & 0xFF,
              dp: dp,
              datatype: datatype,
              length_hi: 0,
              length_lo: payload.length,
              data: payload
            });
            this._log(`${logPrefix} ✅ Time sync attempt ${attempt} sent via command(setData)`);
            return true;
          }

          // Method 3: Fallback - write raw attribute (least likely to work but worth trying)
          this._log(`${logPrefix} ⚠️ No setData/command available, skipping time sync`);
          this._log(`${logPrefix} Available cluster methods:`, Object.keys(tuyaCluster).filter(k => typeof tuyaCluster[k] === 'function').join(', '));
          return false;
        } catch (err1) {
          // Silent fail - time sync is not critical for device operation
          this._log(`${logPrefix} ℹ️ Time sync not supported by this device:`, err1.message);
          return false;
        }
      };

      // v5.5.206: Immediate response timing critical for LCD climate sensors
      // Use setImmediate to respond within MCU's short listening window
      setImmediate(() => {
        sendFrame(1);

        // v5.5.206: Double sync for stubborn LCD climate sensors
        // Many _TZE284_ devices need 2 syncs: first initializes, second validates
        if (options.doubleSync !== false) {
          setTimeout(() => {
            this._log(`${logPrefix} 🔄 Sending second time sync for LCD climate sensor`);
            sendFrame(2);

            // v5.5.207: Send time_valid DP after second sync (if requested)
            if (sendTimeValidDP) {
              setTimeout(() => {
                this._log(`${logPrefix} 📡 Sending time_valid DPs to enable LCD display`);
                this._sendTimeValidDP(zclNode, targetEndpoint);
              }, 100);
            }
          }, 200);
        }
      });

      return true;
    } catch (err) {
      this._log(`${logPrefix} Time sync error: ${err.message}`);
      return false;
    }
  }

  /**
   * v5.5.206: Find the correct endpoint for time sync (LCD climate sensors may use EP3)
   */
  _findTimeEndpoint(zclNode) {
    if (!zclNode?.endpoints) return 1;

    // Log all endpoints for debugging
    Object.keys(zclNode.endpoints).forEach(epId => {
      const endpoint = zclNode.endpoints[epId];
      if (endpoint?.clusters) {
        this._log(`[TUYA] 📍 EP${epId} clusters:`, Object.keys(endpoint.clusters));
      }
    });

    // Check all endpoints for 0xEF00 cluster
    for (const epId of Object.keys(zclNode.endpoints)) {
      const endpoint = zclNode.endpoints[epId];
      const hasEF00 = endpoint?.clusters?.tuyaManufacturer
        || endpoint?.clusters?.tuyaSpecific
        || endpoint?.clusters?.manuSpecificTuya
        || endpoint?.clusters?.[0xEF00];

      if (hasEF00) {
        this._log(`[TUYA] 🎯 Found Tuya cluster on endpoint ${epId}`);
        return parseInt(epId);
      }
    }

    return 1; // Default fallback
  }

  /**
   * v5.5.206: Detect if device needs extended 12-byte payload
   */
  _needsExtendedPayload() {
    const manufacturer = this.device.getData()?.manufacturerName || '';
    const model = this.device.getData()?.productId || '';

    // Known LCD climate sensors that need extended payload
    const extendedPayloadDevices = [
      '_TZE284_vvmbj46n',  // User's specific device
      '_TZE284_',          // TZE284 series generally
      '_TZE200_',          // Some TZE200 LCD devices
    ];

    return extendedPayloadDevices.some(pattern =>
      manufacturer.includes(pattern) || model.includes(pattern)
    );
  }

  /**
   * v5.5.206: Send time_valid DP to enable LCD display on stubborn climate sensors
   * Many LCD climate sensors require a boolean DP to activate time display
   */
  async _sendTimeValidDP(zclNode, endpointId = 1) {
    try {
      const endpoint = zclNode.endpoints?.[endpointId];
      const tuyaCluster = endpoint?.clusters?.tuyaManufacturer
        || endpoint?.clusters?.tuyaSpecific
        || endpoint?.clusters?.manuSpecificTuya
        || endpoint?.clusters?.[0xEF00];

      if (!tuyaCluster) return false;

      // Common DP IDs for time_valid on LCD climate sensors
      const timeValidDPs = [0x65, 0x66, 0x6A, 0x67, 0x68];

      for (const dpId of timeValidDPs) {
        try {
          const seq = Math.floor(Math.random() * 0xFFFF);

          if (typeof tuyaCluster.setData === 'function') {
            await tuyaCluster.setData({
              status: 0,
              transid: seq & 0xFF,
              dp: dpId,
              datatype: 0x01, // BOOL
              length_hi: 0,
              length_lo: 1,
              data: Buffer.from([0x01]) // true
            });
            this._log(`[TUYA] 📡 Sent time_valid DP${dpId}=true on EP${endpointId}`);
          }
        } catch (err) {
          this._log(`[TUYA] ⚠️ Could not send DP${dpId}:`, err.message);
        }
      }

      return true;
    } catch (err) {
      this._log('[TUYA] ❌ time_valid DP send failed:', err.message);
      return false;
    }
  }

  /**
   * Schedule daily time sync
   */
  scheduleDailySync(zclNode) {
    if (this.dailySyncTimer) {
      clearTimeout(this.dailySyncTimer);
    }

    // Calculate ms until 3 AM tomorrow
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(3, 0, 0, 0);
    const msUntil3AM = tomorrow - now;

    this._log(`[TUYA] Next time sync in ${Math.round(msUntil3AM / 1000 / 60 / 60)}h`);

    this.dailySyncTimer = setTimeout(() => {
      this.sendTimeSync(zclNode);
      this.scheduleDailySync(zclNode); // Reschedule
    }, msUntil3AM);
  }

  /**
   * Setup datapoint listener
   * v5.5.39: Added TuyaBoundCluster for proper SDK3 data reception
   */
  setupDatapointListener(tuyaCluster) {
    try {
      this._log('[TUYA] 🎧 Setting up datapoint listeners...');

      // DEBUG: Log cluster structure
      this._log(`[TUYA] 📋 Cluster type: ${tuyaCluster.constructor.name}`);
      this._log(`[TUYA] 📋 Cluster ID: ${tuyaCluster.id || 'unknown'}`);

      // ═══════════════════════════════════════════════════════════════════
      // v5.5.39: CRITICAL FIX - Use BoundCluster for receiving DP reports
      // Regular Cluster = Homey sends TO device
      // BoundCluster = Device sends TO Homey (this is what TS0601 does!)
      // ═══════════════════════════════════════════════════════════════════
      if (TuyaBoundCluster) {
        try {
          const endpoint = this.device.zclNode?.endpoints?.[1];
          if (endpoint) {
            // Create bound cluster instance with our handlers
            const tuyaBound = new TuyaBoundCluster({
              device: this.device,
              onDataReport: (parsed) => {
                this._log('[TUYA-BOUND] 📥 dataReport callback:', JSON.stringify(parsed));
                if (parsed.datapoints) {
                  for (const dp of parsed.datapoints) {
                    // v5.5.204: CRITICAL - Add device safety check
                    if (this.device && !this.device.destroyed) {
                      this.handleParsedDP(dp.dp, dp.value, dp.dataType);
                    }
                  }
                }
              },
              onDataResponse: (parsed) => {
                this._log('[TUYA-BOUND] 📥 dataResponse callback:', JSON.stringify(parsed));
                if (parsed.datapoints) {
                  for (const dp of parsed.datapoints) {
                    // v5.5.204: CRITICAL - Add device safety check
                    if (this.device && !this.device.destroyed) {
                      this.handleParsedDP(dp.dp, dp.value, dp.dataType);
                    }
                  }
                }
              },
              onMcuSyncTime: () => {
                this._log('[TUYA-BOUND] ⏰ Time sync request received');
                // v5.5.206: Use immediate response for LCD climate sensors
                setImmediate(() => {
                  this.sendTimeSync(this.device.zclNode, {
                    doubleSync: true,
                    useExtended: this._needsExtendedPayload()
                  });
                });
              },
            });

            // Bind to endpoint for cluster 0xEF00
            // v5.5.44: Use 'tuya' as primary name (matches TuyaSpecificCluster.NAME)
            // Community pattern: zclNode.endpoints[1].clusters.tuya.on("response", ...)
            const clusterNames = ['tuya', 'tuyaSpecific', 'manuSpecificTuya', 'tuyaManufacturer', 61184, 0xEF00];
            let bound = false;

            for (const clusterName of clusterNames) {
              try {
                endpoint.bind(clusterName, tuyaBound);
                this._log(`[TUYA] ✅ TuyaBoundCluster bound with name: ${clusterName}`);
                bound = true;
                break;
              } catch (e) {
                // Try next name
              }
            }

            if (!bound) {
              this._log('[TUYA] ⚠️ Could not bind TuyaBoundCluster, trying direct method...');
            }
            this._tuyaBoundCluster = tuyaBound;
          }
        } catch (boundErr) {
          this._log('[TUYA] ⚠️ BoundCluster setup failed:', boundErr.message);
          // Continue with fallback methods
        }
      } else {
        this._log('[TUYA] ⚠️ TuyaBoundCluster not available, using fallback listeners');
      }

      // SDK3 CRITICAL: Use bound listener, not .on()
      // TS0601 sends data via raw Zigbee frames, not cluster events

      // Method 1: Bound frame listener (SDK3 way)
      const boundListener = this.handleDatapoint.bind(this);

      // v5.3.62: Listen to 'dp' events from our custom cluster handlers
      if (typeof tuyaCluster.on === 'function') {
        // Listen to individual DP events
        tuyaCluster.on('dp', (dpId, value, dpType) => {
          this._log(`[TUYA] 📥 DP${dpId} = ${value} (type: ${dpType})`);
          // v5.5.204: CRITICAL - Add device safety check
          if (this.device && !this.device.destroyed) {
            this.handleParsedDP(dpId, value, dpType);
          }
        });
        this._log('[TUYA] ✅ dp event listener registered');

        // Also listen to dataReport events
        tuyaCluster.on('dataReport', (data) => {
          this._log('[TUYA] 📦 dataReport EVENT received!', JSON.stringify(data, null, 2));
          if (data.datapoints && Array.isArray(data.datapoints)) {
            for (const dp of data.datapoints) {
              // v5.5.204: CRITICAL - Add device safety check
              if (this.device && !this.device.destroyed) {
                this.handleParsedDP(dp.dp, dp.value, dp.dataType);
              }
            }
          } else {
            // v5.5.204: CRITICAL - Missing device safety check
            if (this.device && !this.device.destroyed) {
              this.handleDatapoint(data);
            }
          }
        });
        this._log('[TUYA] ✅ dataReport listener registered');
      } else {
        this._log('[TUYA] ⚠️  tuyaCluster.on is not a function!');
      }

      // Also listen to any raw frame via passed cluster
      if (typeof tuyaCluster.on === 'function') {
        tuyaCluster.on('response', (data) => {
          this._log('[TUYA] 📦 response EVENT received!', JSON.stringify(data, null, 2));
          // v5.5.202: Safe handleDatapoint call
          if (this.device && !this.device.destroyed) {
            this.handleDatapoint(data);
          }
        });
        this._log('[TUYA] ✅ response listener registered on passed cluster');
      }

      // v5.5.45: COMMUNITY PATTERN - Listen directly on zclNode.endpoints[1].clusters.tuya
      // This is the CONFIRMED working pattern from Homey community
      try {
        const endpoint = this.device.zclNode?.endpoints?.[1];
        const directTuyaCluster = endpoint?.clusters?.tuya;

        if (directTuyaCluster && typeof directTuyaCluster.on === 'function') {
          // Response event (most common)
          directTuyaCluster.on('response', (value) => {
            this._log('[TUYA-DIRECT] 📥 response received!', JSON.stringify(value));
            // v5.5.202: Safe handleDatapoint call
            if (this.device && !this.device.destroyed) {
              this.handleDatapoint(value);
            }
          });

          // Reporting event
          directTuyaCluster.on('reporting', (value) => {
            this._log('[TUYA-DIRECT] 📥 reporting received!', JSON.stringify(value));
            // v5.5.202: Safe handleDatapoint call
            if (this.device && !this.device.destroyed) {
              this.handleDatapoint(value);
            }
          });

          // DP events
          directTuyaCluster.on('dp', (dpId, value, dpType) => {
            this._log(`[TUYA-DIRECT] 📥 DP${dpId} = ${value}`);
            // v5.5.202: Safe handleParsedDP call
            if (this.device && !this.device.destroyed) {
              this.handleParsedDP(dpId, value, dpType);
            }
          });

          this._log('[TUYA] ✅ Direct cluster listeners registered (zclNode.endpoints[1].clusters.tuya)');
        } else {
          this._log('[TUYA] ⚠️ Direct tuya cluster not available or no .on() method');
          this._log('[TUYA] Available clusters:', Object.keys(endpoint?.clusters || {}).join(', '));
        }
      } catch (directErr) {
        this._log('[TUYA] ⚠️ Direct cluster listener failed:', directErr.message);
      }

      // Listen to ALL cluster events for debugging
      if (typeof tuyaCluster.on === 'function') {
        const allEvents = ['data', 'command', 'report', 'datapoint'];
        allEvents.forEach(eventName => {
          tuyaCluster.on(eventName, (data) => {
            this._log(`[TUYA] 📦 ${eventName} EVENT received!`, JSON.stringify(data, null, 2));
            // v5.5.202: Safe handleDatapoint call
            if (this.device && !this.device.destroyed) {
              this.handleDatapoint(data);
            }
          });
        });
        this._log('[TUYA] ✅ Additional event listeners registered');
      }

      // Try to bind to cluster's command handler
      if (tuyaCluster.constructor && tuyaCluster.constructor.COMMANDS) {
        this._log('[TUYA] 📋 Available commands:', Object.keys(tuyaCluster.constructor.COMMANDS).join(', '));
      }

      // SDK3: Listen directly to cluster commands
      // dataReport = command 0x01 or 0x02
      const dataReportHandler = async (data) => {
        this._log('[TUYA] 📥 DataReport received:', JSON.stringify(data));
        // v5.5.202: Safe handleDatapoint call
        if (this.device && !this.device.destroyed) {
          await this.handleDatapoint(data);
        }
      };

      // Bind to both possible command names
      if (tuyaCluster.constructor.COMMANDS) {
        // Register for dataReport command (0x01)
        try {
          const endpoint = this.device.zclNode?.endpoints?.[1];
          if (endpoint) {
            endpoint.on('frame', (frame) => {
              // Check if it's from Tuya cluster
              if (frame.cluster === 0xEF00 || frame.cluster === 61184) {
                this._log('[TUYA] 📥 Raw frame:', JSON.stringify({
                  cluster: frame.cluster,
                  command: frame.command,
                  data: frame.data?.toString('hex')
                }));

                // Parse Tuya frame
                if (frame.data && frame.data.length > 0) {
                  this.parseTuyaFrame(frame.data);
                }
              }
            });
            this._log('[TUYA] ✅ Raw frame listener registered');
          }
        } catch (err) {
          this._log('[TUYA] ⚠️ Frame listener failed:', err.message);
        }
      }

      this._log('[TUYA] ✅ Datapoint listener configured (SDK3 frame mode)');
    } catch (err) {
      this._error('[TUYA] Failed to setup listener:', err.message);
    }
  }

  /**
   * Request datapoint value from device (SDK3)
   * v5.2.9: Improved with smart retry for stubborn devices
   */
  async requestDP(dp, options = {}) {
    const { retry = false, maxRetries = 2 } = options;

    try {
      this._log(`[TUYA] 🔍 Requesting DP ${dp}...`);

      // v5.5.54: Check if device forces active mode (climate/soil sensors)
      const forceActive = this.device.forceActiveTuyaMode === true;

      // v5.5.50: In passive mode, still TRY to send for mains-powered devices
      // v5.5.54: ALSO send if device explicitly forces active mode
      if (this.passiveMode && !forceActive) {
        const isBattery = this.device.hasCapability?.('measure_battery') && !this.device.mainsPowered;
        if (isBattery) {
          this._log(`[TUYA] ℹ️  Passive mode + battery device - skipping active request for DP${dp}`);
          return false;
        }
        this._log(`[TUYA] ⚡ Passive mode but mains-powered - attempting request for DP${dp}`);
      } else if (this.passiveMode && forceActive) {
        this._log(`[TUYA] 🔥 Passive mode but forceActiveTuyaMode=true - sending DP${dp} request`);
      }

      const endpoint = this.device.zclNode?.endpoints?.[1];
      if (!endpoint) {
        this._log('[TUYA] ℹ️  Endpoint 1 not available for requestDP');
        return false;
      }

      // v5.2.9: Enhanced cluster detection
      const tuyaCluster = this.tuyaCluster
        || endpoint.clusters.tuya
        || endpoint.clusters.tuyaManufacturer
        || endpoint.clusters.tuyaSpecific
        || endpoint.clusters.manuSpecificTuya
        || endpoint.clusters['61184']
        || endpoint.clusters[61184]
        || endpoint.clusters[0xEF00];

      if (!tuyaCluster) {
        if (!this._clusterMissingLogged) {
          this._log('[TUYA] ℹ️  Tuya cluster not available - device may use standard Zigbee');
          this._clusterMissingLogged = true;
        }
        return false;
      }

      const seq = Math.floor(Math.random() * 0xFFFF);

      // v5.5.272: Enhanced with multiple fallback methods
      const attemptRequest = async (attempt = 0) => {
        try {
          const dpBuffer = Buffer.from([dp]);
          const timeoutMs = this.device.hasCapability?.('measure_battery') ? 3000 : 8000;
          let sent = false;

          // Method 1: getData (standard Tuya)
          if (!sent && typeof tuyaCluster.getData === 'function') {
            try {
              await Promise.race([
                tuyaCluster.getData({ seq: seq, datapoints: dpBuffer }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs))
              ]);
              this._log(`[TUYA] ✅ DP${dp} query sent via getData`);
              sent = true;
            } catch (e) { /* try next method */ }
          }

          // Method 2: dataQuery command (alternative name)
          if (!sent && typeof tuyaCluster.dataQuery === 'function') {
            try {
              await Promise.race([
                tuyaCluster.dataQuery({ seq: seq, dp: dp }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs))
              ]);
              this._log(`[TUYA] ✅ DP${dp} query sent via dataQuery`);
              sent = true;
            } catch (e) { /* try next method */ }
          }

          // Method 3: Generic command() with dataQuery
          if (!sent && typeof tuyaCluster.command === 'function') {
            try {
              await Promise.race([
                tuyaCluster.command('dataQuery', { dp: dp }, { disableDefaultResponse: true }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs))
              ]);
              this._log(`[TUYA] ✅ DP${dp} query sent via command('dataQuery')`);
              sent = true;
            } catch (e) { /* try next method */ }
          }

          // Method 4: Raw frame via writeRaw (0x04 = getData command)
          if (!sent && typeof tuyaCluster.writeRaw === 'function') {
            try {
              const frame = Buffer.from([(seq >> 8) & 0xFF, seq & 0xFF, dp]);
              await Promise.race([
                tuyaCluster.writeRaw(0x04, frame),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs))
              ]);
              this._log(`[TUYA] ✅ DP${dp} query sent via writeRaw`);
              sent = true;
            } catch (e) { /* try next method */ }
          }

          // Method 5: mcuVersionRequest triggers device to send all DPs (some devices)
          if (!sent && typeof tuyaCluster.mcuVersionRequest === 'function' && dp === 1) {
            try {
              await tuyaCluster.mcuVersionRequest({}).catch(() => { });
              this._log(`[TUYA] ✅ mcuVersionRequest sent (triggers DP reports)`);
              sent = true;
            } catch (e) { /* ignore */ }
          }

          if (!sent) {
            // v5.5.272: Log once per device, not spam
            if (!this._getDataNotAvailableLogged) {
              this._log('[TUYA] ℹ️ No active query method available - using passive reporting only');
              this._getDataNotAvailableLogged = true;
            }
            return false;
          }

          return true;
        } catch (err) {
          const isTimeout = err.message?.includes('Timeout');

          // v5.2.9: Retry for mains-powered devices on timeout
          if (retry && attempt < maxRetries && isTimeout) {
            const delay = 2000 * (attempt + 1); // Exponential backoff
            this._log(`[TUYA] ⏱️ DP${dp} timeout, retry ${attempt + 1}/${maxRetries} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return attemptRequest(attempt + 1);
          }

          // Battery devices timeout is normal - v5.3.15: Set default values
          if (this.device.hasCapability?.('measure_battery')) {
            this._log(`[TUYA] ℹ️  DP${dp} timeout - normal for battery devices (passive mode)`);

            // v5.3.15: Set default value so KPI is not null
            // Battery DPs: 4, 14, 15, 10, 101
            if ([4, 10, 14, 15, 101].includes(dp)) {
              const currentBattery = this.device.getCapabilityValue?.('measure_battery');
              if (currentBattery === null || currentBattery === undefined) {
                this._log('[TUYA] 📊 Setting default battery value (wait for wake-up)');
                // Set to 100% as "unknown" default - will update on first report
                this.device.setCapabilityValue?.('measure_battery', 100).catch(() => { });
              }
            }
          } else {
            this._log(`[TUYA] getData failed for DP${dp}:`, err.message);
          }
          return false;
        }
      };

      return await attemptRequest(0);

    } catch (err) {
      this._log('[TUYA] ℹ️  requestDP:', err.message || err);
      return false;
    }
  }

  /**
   * Parse raw Tuya frame data using TuyaDPParser
   * Integrates official Tuya DP type parsing
   */
  parseTuyaFrame(buffer) {
    try {
      // Tuya frame format: [status:1][seq:1][dp:1][type:1][len:2][data:len]
      let offset = 0;

      while (offset < buffer.length) {
        if (offset + 6 > buffer.length) break;

        // Use TuyaDPParser for consistent parsing
        const dpBuffer = buffer.slice(offset);
        try {
          const parsed = TuyaDPParser.parse(dpBuffer);

          this._log(`[TUYA] 📊 Parsed DP ${parsed.dpId}: type=${parsed.dpType}, value=${JSON.stringify(parsed.dpValue)}`);

          this.handleDatapoint({
            dp: parsed.dpId,
            datatype: parsed.dpType,
            data: parsed.dpValue
          });

          // Calculate offset for next DP
          const dpTypeSize = dpBuffer.readUInt8(3);
          const dataLength = dpBuffer.readUInt16BE(4);
          offset += 6 + dataLength;
        } catch (parseErr) {
          this._error('[TUYA] DP parse error:', parseErr.message);
          break;
        }
      }
    } catch (err) {
      this._error('[TUYA] Frame parse failed:', err.message);
    }
  }

  /**
   * Send Tuya DP command using TuyaDPParser
   * @param {number} dp - Data Point ID
   * @param {number} dpType - DP Type (from TuyaDPParser.DP_TYPE)
   * @param {any} value - Value to send
   */
  async sendTuyaDP(dp, dpType, value) {
    try {
      this._log(`[TUYA] 📤 Sending DP${dp} = ${value} (type: ${dpType})`);

      const endpoint = this.device.zclNode?.endpoints?.[1];
      if (!endpoint) {
        throw new Error('Endpoint not available');
      }

      const tuyaCluster = endpoint.clusters.tuyaManufacturer
        || endpoint.clusters.tuyaSpecific
        || endpoint.clusters.manuSpecificTuya
        || endpoint.clusters[0xEF00];

      if (!tuyaCluster) {
        throw new Error('Tuya cluster not available');
      }

      // Use TuyaDPParser to encode
      const buffer = TuyaDPParser.encode(dp, dpType, value);

      // Send via cluster
      await endpoint.sendFrame(0xEF00, buffer, 0x00);

      this._log(`[TUYA] ✅ DP${dp} sent successfully`);
      return true;
    } catch (err) {
      this._error(`[TUYA] Failed to send DP${dp}:`, err.message);
      return false;
    }
  }

  /**
   * v5.3.62: Handle already-parsed DP (from cluster event)
   */
  handleParsedDP(dpId, value, dpType) {
    this._log(`[TUYA-DP] 📦 Parsed DP${dpId} = ${value} (type: ${dpType})`);

    // Convert to the format handleDatapoint expects
    this.handleDatapoint({
      dpId: dpId,
      dp: dpId,
      dpValue: value,
      data: value,
      dpType: dpType,
      datatype: dpType
    });
  }

  /**
   * Process Tuya datapoint data
   */
  async handleDatapoint(data) {
    // v5.5.202: Enhanced device safety checks
    // v5.5.318: Fixed this.log not a function error
    if (!this.device || this.device.destroyed || !this.device.homey) {
      this.device?.log?.('[TUYA] Device not available or destroyed, skipping datapoint');
      return;
    }

    const dp = data.dp || data.dpId || data.id;
    let value = data.value || data.dpValue || data.data;  // v5.5.205: Changed to let for reassignment
    const dpType = data.datatype || data.dpType || 'unknown';

    // v5.3.62: Use AdaptiveDataParser for universal data handling
    if (AdaptiveDataParser && value !== undefined) {
      const context = this._getDPContext(dp);
      const parsed = AdaptiveDataParser.parse(value, context);

      this._log(`[TUYA-DP] 📦 DP${dp} received: raw=${JSON.stringify(value)}, parsed=${parsed.value}, type=${parsed.type}`);

      // Apply sensor conversion based on context
      if (context.includes('temp')) {
        value = AdaptiveDataParser.toTemperature(parsed.value);
        this._log(`[TUYA-DP] 🌡️ Converted to temperature: ${value}°C`);
      } else if (context.includes('humid')) {
        value = AdaptiveDataParser.toHumidity(parsed.value);
        this._log(`[TUYA-DP] 💧 Converted to humidity: ${value}%`);
      } else if (context.includes('battery')) {
        value = AdaptiveDataParser.toBattery(parsed.value);
        this._log(`[TUYA-DP] 🔋 Converted to battery: ${value}%`);
      } else if (context.includes('illumin') || context.includes('lux')) {
        value = AdaptiveDataParser.toIlluminance(parsed.value);
        this._log(`[TUYA-DP] ☀️ Converted to illuminance: ${value} lux`);
      } else {
        value = parsed.value;
      }
    } else {
      this._log(`[TUYA-DP] 📦 DP${dp} received: value=${JSON.stringify(value)}, type=${dpType}`);
    }

    // v5.2.10: Store last data received timestamp for KPI
    this.device.setStoreValue('last_data_received', Date.now()).catch(() => { });
    this.device.setStoreValue(`dp_${dp}_value`, value).catch(() => { });
    this.device.setStoreValue(`dp_${dp}_timestamp`, Date.now()).catch(() => { });

    // Emit event for driver-specific handling
    this.emit(`dp-${dp}`, value);
    this.emit('datapoint', { dp, value, dpType });

    // v5.5.373: Record Tuya DP for intelligent adapter learning
    if (this.device?.intelligentAdapter && typeof this.device.intelligentAdapter.recordTuyaDP === 'function') {
      this.device.intelligentAdapter.recordTuyaDP(dp, value, dpType);
    }

    // v5.5.927: Universal Variant Manager - dynamic capability detection for manufacturer variants
    // Same manufacturerName can have different capabilities - detect and add dynamically
    if (this.device?.variantManager && typeof this.device.variantManager.processDP === 'function') {
      this.device.variantManager.processDP(dp, value, dpType).catch(e => {
        this._log?.(`[VARIANT] DP${dp} processing error: ${e.message}`);
      });
    }

    // v5.2.10: PATCH 3 - Emit dpReport for drivers to listen to
    this.emit('dpReport', {
      device: this.device,
      dpId: dp,
      dpType: dpType,
      value: value,
      timestamp: Date.now()
    });

    // v5.5.552: Flow card triggering removed - cards don't exist and cause stderr spam
    // Device-specific flow cards should be handled by individual drivers if needed

    // v5.2.10: PATCH 3 - Forward battery DPs to BatteryManagerV4
    const batteryDPs = [4, 14, 15, 33, 35];
    if (batteryDPs.includes(dp)) {
      this._forwardToBatteryManager(dp, value);
    }

    // v5.5.226: Check device's dpMappings FIRST before using defaults
    // This ensures device-specific mappings take priority
    const deviceDpMappings = this.device.dpMappings || {};
    if (deviceDpMappings[dp] && deviceDpMappings[dp].capability) {
      // Device has its own mapping for this DP - let it handle
      return;
    }

    // Common DP mappings (override in device-specific code)
    // NOTE: DP 1 can be BOTH temperature AND motion depending on device type!
    const dpMappings = {
      // Soil Sensor DPs
      1: 'measure_temperature',   // Temperature (°C * 10) - most common
      // 1: 'alarm_motion',       // Motion (bool) - for PIR sensors - handled by driver override
      2: 'measure_humidity',       // Humidity (% * 10) OR sensitivity for PIR
      3: 'measure_temperature',    // Soil temperature (°C * 10)
      5: 'measure_humidity',       // Soil moisture (% * 10) - SOIL SENSOR CRITICAL!

      // PIR/Motion Sensor DPs
      9: 'target_distance',        // PIR target distance (cm)
      101: 'radar_sensitivity',    // PIR sensitivity
      102: 'illuminance_threshold', // PIR lux threshold

      // v5.5.226: Illuminance DPs for radar sensors
      12: 'measure_luminance',     // Illuminance (lux) - common
      103: 'measure_luminance',    // Illuminance (lux) - radar alt
      106: 'measure_luminance',    // Illuminance (lux) - ZG-204ZM radar

      // Battery
      4: 'measure_battery',        // Battery % (some devices)
      14: 'alarm_battery',         // Battery low alarm (bool)
      15: 'measure_battery',       // Battery % (most common)

      // Contact/Motion
      7: 'alarm_contact',          // Contact (bool)
      18: 'measure_temperature',   // Alt temperature
      19: 'measure_humidity',      // Alt humidity

      // Switches - removed 103 (conflict with luminance)
    };

    const capability = dpMappings[dp];

    if (capability) {
      // Check if device has this capability
      if (!this.device.hasCapability(capability)) {
        this._log(`[TUYA] ⚠️ Device missing capability ${capability} for DP ${dp} - skipping`);

        // Try to add it if it's a standard capability
        if (capability.startsWith('measure_') || capability.startsWith('alarm_')) {
          try {
            this.device.addCapability(capability).catch(err => {
              this._log(`[TUYA] ℹ️ Cannot add ${capability}: ${err.message}`);
            });
          } catch (e) {
            // Ignore
          }
        }

        // Store in DP pool anyway
        if (this.device.setTuyaDpValue) {
          this.device.setTuyaDpValue(dp, value);
        }
        return;
      }

      // Parse value based on type
      let parsedValue = value;

      // Temperature/Humidity/Voltage: divide by 10
      if (capability.includes('temperature') || capability.includes('humidity') || capability === 'measure_voltage') {
        parsedValue = typeof value === 'number' ? value / 10 : value;
      }

      // Current: convert mA to A
      if (capability === 'measure_current') {
        parsedValue = typeof value === 'number' ? value / 1000 : value;
      }

      // Distance: cm to meters for some capabilities
      if (capability === 'target_distance') {
        parsedValue = typeof value === 'number' ? value / 100 : value;
      }

      // Bool: ensure boolean
      if (capability.includes('alarm') || capability === 'onoff' || capability === 'onoff.usb2' || capability === 'led_mode') {
        parsedValue = Boolean(value);
      }

      this.device.setCapabilityValue(capability, parsedValue)
        .then(() => {
          this._log(`[TUYA] ✅ ${capability} = ${parsedValue} (DP ${dp})`);
        })
        .catch(err => {
          this._error(`[TUYA] ❌ Failed to set ${capability}:`, err.message);
        });
    } else {
      // Use DP pool for unknown DPs
      if (this.device.setTuyaDpValue) {
        this.device.setTuyaDpValue(dp, value);
      } else {
        this._log(`[TUYA] ℹ️ Unmapped DP ${dp}, value: ${JSON.stringify(value)}`);
      }
    }
  }

  /**
   * v5.2.10: PATCH 3 - Forward battery DP to BatteryManagerV4
   */
  _forwardToBatteryManager(dpId, value) {
    try {
      // Try multiple paths to find battery manager
      const batteryManager = this.device.batteryManagerV4
        || this.device.batteryManager
        || this.device._batteryManager;

      if (batteryManager && typeof batteryManager.onTuyaDPBattery === 'function') {
        this._log(`[TUYA] 🔋 Forwarding DP${dpId} to BatteryManager`);
        batteryManager.onTuyaDPBattery({ dpId, value });
      } else {
        // Fallback: emit event that BatteryManager can listen to
        this._log(`[TUYA] 🔋 Battery DP${dpId} = ${value} (no batteryManager found, emitting event)`);
        this.emit('batteryDP', { dpId, value });
      }
    } catch (err) {
      this._error('[TUYA] ❌ Battery forward error:', err.message);
    }
  }

  /**
   * v5.3.62: Get context hint for DP ID (used by AdaptiveDataParser)
   * v5.5.344: FIX - Check device's local dpMappings FIRST before using generic context
   * This prevents contact sensors (DP1=contact) from being treated as temperature
   */
  _getDPContext(dpId) {
    // v5.5.344: CRITICAL - Check device's dpMappings first!
    // This prevents wrong context (e.g., DP1 = temperature for climate sensors, but contact for door sensors)
    if (this.device?.dpMappings?.[dpId]) {
      const localMapping = this.device.dpMappings[dpId];
      if (localMapping.capability) {
        // Return capability name as context (e.g., 'alarm_contact', 'measure_temperature')
        return localMapping.capability;
      }
    }

    // Generic fallback contexts (only used if device has no local mapping)
    const dpContexts = {
      // NOTE: These are GENERIC mappings - device-specific dpMappings take priority!
      // DP1 can be temperature OR contact depending on device type
      2: 'humidity',
      3: 'temperature_soil',
      4: 'battery',
      5: 'humidity_soil',
      6: 'motion',
      7: 'alarm_contact',
      9: 'distance',
      14: 'battery_low',
      15: 'battery',
      18: 'temperature',
      19: 'humidity',
      20: 'illuminance',
      101: 'sensitivity',
      102: 'illuminance_threshold'
    };
    return dpContexts[dpId] || `dp_${dpId}`;
  }

  /**
   * v5.2.15: Enhanced stubborn device handler with adaptive retry
   * For devices that don't respond to initial DP requests
   */
  async handleStubbornDevice() {
    this._log('[TUYA] 🔄 Handling stubborn device with adaptive retry...');

    // Track retry state
    if (!this._stubbornRetryCount) {
      this._stubbornRetryCount = 0;
    }
    this._stubbornRetryCount++;

    // Max 5 retry cycles
    if (this._stubbornRetryCount > 5) {
      this._log('[TUYA] ⚠️ Device remains unresponsive after 5 retry cycles');
      this._log('[TUYA] ℹ️ Will rely on passive wake-up reports');
      this._stubbornRetryCount = 0;
      return false;
    }

    const backoffMs = Math.min(2000 * Math.pow(2, this._stubbornRetryCount - 1), 60000);
    this._log(`[TUYA] ⏱️ Retry ${this._stubbornRetryCount}/5 with ${backoffMs}ms backoff`);

    await new Promise(resolve => setTimeout(resolve, backoffMs));

    // Critical DPs to request
    const criticalDPs = this.deviceInfo?.dps
      ? Object.keys(this.deviceInfo.dps).map(Number)
      : [1, 2, 4, 15]; // Fallback critical DPs

    let gotResponse = false;

    for (const dpId of criticalDPs) {
      try {
        await this.requestDP(dpId);
        await new Promise(resolve => setTimeout(resolve, 300));

        // Check if we got any data stored
        const lastData = await this.device.getStoreValue('last_data_received').catch(() => null);
        if (lastData && (Date.now() - lastData) < 5000) {
          gotResponse = true;
          break;
        }
      } catch (e) {
        // Continue to next DP
      }
    }

    if (gotResponse) {
      this._log('[TUYA] ✅ Stubborn device responded!');
      this._stubbornRetryCount = 0;
      return true;
    }

    // Schedule another retry if we still have attempts left
    if (this._stubbornRetryCount < 5) {
      this._log('[TUYA] ⏳ Scheduling next retry attempt...');
      setTimeout(() => this.handleStubbornDevice(), backoffMs * 2);
    }

    return false;
  }

  /**
   * v5.2.15: Check device communication health
   */
  async checkDeviceHealth() {
    const health = {
      responding: false,
      lastData: null,
      lastDataAge: null,
      dpCount: 0
    };

    try {
      // Check last data received
      const lastData = await this.device.getStoreValue('last_data_received').catch(() => null);
      if (lastData) {
        health.lastData = new Date(lastData).toISOString();
        health.lastDataAge = Math.round((Date.now() - lastData) / 1000);
        health.responding = health.lastDataAge < 3600; // Consider healthy if data within 1 hour
      }

      // Count stored DP values
      const store = this.device.getStore ? this.device.getStore() : {};
      for (const key of Object.keys(store)) {
        if (key.startsWith('dp_') && key.endsWith('_value')) {
          health.dpCount++;
        }
      }

      this._log(`[TUYA] Health: ${health.responding ? '✅' : '⚠️'} responding=${health.responding}, lastDataAge=${health.lastDataAge}s, dpCount=${health.dpCount}`);
    } catch (e) {
      this._log('[TUYA] Health check error:', e.message);
    }

    return health;
  }

  /**
   * v5.2.15: Force wake-up for sleepy devices
   * Sends multiple rapid requests to catch device during brief wake window
   */
  async forceWakeUp() {
    this._log('[TUYA] 🔔 Attempting to catch device wake window...');

    // Send rapid burst of requests
    const burst = async () => {
      for (let i = 0; i < 3; i++) {
        await this.requestDP(1);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };

    // Try multiple bursts over 30 seconds
    for (let attempt = 0; attempt < 6; attempt++) {
      await burst();
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check if we got data
      const lastData = await this.device.getStoreValue('last_data_received').catch(() => null);
      if (lastData && (Date.now() - lastData) < 3000) {
        this._log('[TUYA] ✅ Device woke up and responded!');
        return true;
      }
    }

    this._log('[TUYA] ⏳ Device did not respond during wake attempts');
    return false;
  }

  /**
   * v5.5.682: LocalTuya-inspired entity detection
   * Detects device type from received DPs and returns appropriate mappings
   */
  detectEntityType(receivedDPs) {
    if (!this.entityHandler) return null;
    const type = this.entityHandler.detectType(receivedDPs);
    this.detectedEntityType = type;
    this._log(`[TUYA-LT] 🔍 Detected entity type: ${type}`);
    return { type, mapping: this.entityHandler.getMapping(type) };
  }

  /**
   * v5.5.682: LocalTuya-inspired DP conversion
   */
  convertDPValue(dpId, rawValue) {
    if (!this.entityHandler || !this.detectedEntityType) return rawValue;
    return this.entityHandler.convertDP(dpId, rawValue, this.detectedEntityType);
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.dailySyncTimer) {
      clearTimeout(this.dailySyncTimer);
      this.dailySyncTimer = null;
    }

    // Remove listeners
    if (this.tuyaCluster) {
      try {
        this.tuyaCluster.removeAllListeners('dataReport');
        this.tuyaCluster.removeAllListeners('response');
      } catch (err) {
        // Ignore
      }
    }
  }
}

module.exports = TuyaEF00Manager;
module.exports.TIME_FORMATS = TIME_FORMATS;
module.exports.TIME_SYNC_COMMANDS = TIME_SYNC_COMMANDS;
module.exports.TUYA_EPOCH_OFFSET = TUYA_EPOCH_OFFSET;
module.exports.ZIGBEE_EPOCH_OFFSET = ZIGBEE_EPOCH_OFFSET;
module.exports.TIMEZONE_OFFSETS = TIMEZONE_OFFSETS;
