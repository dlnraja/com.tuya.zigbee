'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                    UNIVERSAL TUYA PARSER v5.5.142                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                          ║
 * ║  Shared module for intelligent Tuya data parsing across ALL drivers                      ║
 * ║                                                                                          ║
 * ║  Features:                                                                               ║
 * ║  - Multi-format frame parsing (5 strategies)                                             ║
 * ║  - Auto-discovery of unknown DPs                                                         ║
 * ║  - Universal DP patterns from Z2M/ZHA/Community/Tuya Official Docs                       ║
 * ║  - DEVICE PROFILES: Context-aware DP mapping by manufacturerName/productId              ║
 * ║  - Universal ZCL cluster handlers for ALL standard clusters                              ║
 * ║  - Value-based auto-detection                                                            ║
 * ║  - Tuya 0xEF00 command handling                                                          ║
 * ║  - Time synchronization support                                                          ║
 * ║                                                                                          ║
 * ║  Sources:                                                                                ║
 * ║  - https://developer.tuya.com/en/docs/iot/tuya-zigbee-universal-docking-access-standard  ║
 * ║  - https://github.com/zigbeefordomoticz/wiki/blob/master/en-eng/Technical/Tuya-0xEF00.md ║
 * ║  - https://github.com/Koenkk/zigbee2mqtt (device converters)                             ║
 * ║  - https://github.com/zigpy/zha-device-handlers (quirks)                                 ║
 * ║                                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════════════════
// TUYA DP DATA TYPES (Official Tuya Documentation)
// ═══════════════════════════════════════════════════════════════════════════════════════════
const TUYA_DP_TYPE = {
  RAW: 0x00,      // Raw bytes
  BOOL: 0x01,     // Boolean (1 byte: 0x00=false, 0x01=true)
  VALUE: 0x02,    // 4-byte signed integer (big-endian)
  STRING: 0x03,   // Variable length UTF-8 string
  ENUM: 0x04,     // Enumeration (1 byte)
  BITMAP: 0x05,   // Bitmap/fault (1 byte)
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// TUYA 0xEF00 COMMAND IDs (Official Tuya Documentation)
// ═══════════════════════════════════════════════════════════════════════════════════════════
const TUYA_COMMANDS = {
  PRODUCT_INFO: 0x01,       // Product Information Inquiry/Reporting
  DEVICE_STATUS: 0x02,      // Device Status Query/Report
  DEVICE_RESET: 0x03,       // Zigbee Device Reset
  ORDER_ISSUE: 0x04,        // Order Issuance
  STATUS_REPORT: 0x05,      // Status Report
  STATUS_SEARCH: 0x06,      // Status Search
  FUNCTIONAL_TEST: 0x08,    // Device Functional Test
  KEY_INFO: 0x09,           // Query key information (scene switch)
  SCENE_WAKEUP: 0x0A,       // Scene wakeup command
  MCU_VERSION: 0x10,        // Request MCU version (Magic Packet)
  MCU_OTA: 0x11,            // MCU OTA update
  TIME_SYNC: 0x24,          // Time synchronization
  DATA_QUERY: 0x03,         // Data query (alias)
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * DEVICE PROFILES v5.5.142 - Context-aware DP mappings by device type
 * Priority: manufacturerName > productId > driverType > universal fallback
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */
const DEVICE_PROFILES = {
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // RADAR / PRESENCE SENSORS (ZG-204ZM, ZY-M100, etc.)
  // ═══════════════════════════════════════════════════════════════════════════════════════
  '_TZE200_2aaelwxk': { // ZG-204ZM
    type: 'radar',
    dpMappings: {
      1: { capability: 'alarm_motion', transform: v => !!v },
      2: { capability: null, setting: 'large_motion_sensitivity' },
      4: { capability: null, setting: 'large_motion_distance', transform: v => v / 100 },
      101: { capability: 'alarm_motion', transform: v => v > 0 },  // motion_state
      102: { capability: null, setting: 'fading_time' },
      104: { capability: null, setting: 'medium_motion_distance', transform: v => v / 100 },
      105: { capability: null, setting: 'medium_motion_sensitivity' },
      106: { capability: 'measure_luminance', transform: v => v },  // illuminance!
      107: { capability: null, setting: 'indicator' },
      108: { capability: null, setting: 'small_detection_distance' },
      109: { capability: null, setting: 'small_detection_sensitivity' },
    }
  },
  '_TZE200_kb5noeto': { inherit: '_TZE200_2aaelwxk' }, // ZG-204ZM variant
  '_TZE200_5b5noeto': { inherit: '_TZE200_2aaelwxk' }, // ZG-204ZM variant
  '_TZE204_sxm7l9xa': { inherit: '_TZE200_2aaelwxk' }, // Similar radar
  '_TZE204_ztc6ggyl': { // ZY-M100 / TS0601 presence
    type: 'radar',
    dpMappings: {
      1: { capability: 'alarm_motion', transform: v => !!v },
      9: { capability: null, setting: 'sensitivity' },
      10: { capability: null, setting: 'keep_time' },
      12: { capability: 'measure_luminance', transform: v => v },
      101: { capability: 'alarm_motion', transform: v => v > 0 },
      102: { capability: null, setting: 'fading_time' },
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // PIR MOTION SENSORS
  // ═══════════════════════════════════════════════════════════════════════════════════════
  '_TZ3000_mcxw5ehu': { // Standard PIR
    type: 'pir',
    dpMappings: {
      1: { capability: 'alarm_motion', transform: v => !!v },
      4: { capability: 'measure_battery', transform: v => Math.min(100, v) },
      5: { capability: 'alarm_tamper', transform: v => !!v },
      9: { capability: null, setting: 'sensitivity' },
      12: { capability: 'measure_luminance', transform: v => v },
    }
  },
  '_TZE200_3towulqd': { // Fantem PIR 4-in-1
    type: 'pir_multi',
    dpMappings: {
      101: { capability: 'alarm_motion', transform: v => !!v },
      102: { capability: 'measure_luminance', transform: v => v },
      103: { capability: 'measure_temperature', transform: v => v / 10 },
      104: { capability: 'measure_humidity', transform: v => v },
      105: { capability: 'measure_battery', transform: v => ({ 0: 10, 1: 50, 2: 100 }[v] ?? 50) },
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // CONTACT SENSORS (Door/Window)
  // ═══════════════════════════════════════════════════════════════════════════════════════
  '_TZ3000_26fmupbb': { // Standard contact sensor
    type: 'contact',
    dpMappings: {
      1: { capability: 'alarm_contact', transform: v => !!v },  // 0=closed, 1=open
      2: { capability: 'measure_battery', transform: v => Math.min(100, v) },
      4: { capability: 'alarm_tamper', transform: v => !!v },
    }
  },
  '_TZ3000_402jjyro': { inherit: '_TZ3000_26fmupbb' },
  '_TYZB01_xph99wvr': { inherit: '_TZ3000_26fmupbb' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // WATER LEAK SENSORS
  // ═══════════════════════════════════════════════════════════════════════════════════════
  '_TZ3000_fxspvqra': { // Standard water leak
    type: 'water_leak',
    dpMappings: {
      1: { capability: 'alarm_water', transform: v => !!v },
      4: { capability: 'measure_battery', transform: v => Math.min(100, v) },
      5: { capability: 'alarm_tamper', transform: v => !!v },
    }
  },
  '_TZ3000_kyb656no': { inherit: '_TZ3000_fxspvqra' },
  '_TZE200_qq9mpfhw': { inherit: '_TZ3000_fxspvqra' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // TEMPERATURE / HUMIDITY SENSORS
  // ═══════════════════════════════════════════════════════════════════════════════════════
  '_TZ3000_xr3htd96': { // Standard temp/humid
    type: 'temp_humid',
    dpMappings: {
      1: { capability: 'measure_temperature', transform: v => v / 10 },
      2: { capability: 'measure_humidity', transform: v => v },
      4: { capability: 'measure_battery', transform: v => Math.min(100, v) },
    }
  },
  '_TZE200_a8sdabtg': { // LCD temp/humid (soil sensor style)
    type: 'temp_humid_lcd',
    dpMappings: {
      1: { capability: 'measure_temperature', transform: v => v / 10 },
      2: { capability: 'measure_humidity', transform: v => v },
      5: { capability: 'measure_battery', transform: v => Math.min(100, v) },
    }
  },
  '_TZE284_vvmbj46n': { // LCD climate monitor
    type: 'temp_humid_lcd',
    dpMappings: {
      1: { capability: 'measure_temperature', transform: v => v / 10 },
      2: { capability: 'measure_humidity', transform: v => v },
      4: { capability: 'measure_battery', transform: v => Math.min(100, v) },
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // SMOKE DETECTORS
  // ═══════════════════════════════════════════════════════════════════════════════════════
  '_TZE200_ntcy3xu1': { // Smoke detector
    type: 'smoke',
    dpMappings: {
      1: { capability: 'alarm_smoke', transform: v => !!v },
      14: { capability: 'measure_battery', transform: v => ({ 0: 10, 1: 50, 2: 100 }[v] ?? 50) },
      15: { capability: 'measure_battery', transform: v => Math.min(100, v) },
    }
  },
  '_TZE200_m9skfctm': { inherit: '_TZE200_ntcy3xu1' },
  '_TZE200_rccxox8p': { inherit: '_TZE200_ntcy3xu1' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // THERMOSTATS / TRV
  // ═══════════════════════════════════════════════════════════════════════════════════════
  '_TZE200_chyvmhay': { // TV02 thermostat
    type: 'thermostat',
    dpMappings: {
      1: { capability: 'onoff', transform: v => !!v },
      2: { capability: null, setting: 'system_mode' },  // 0=cool, 1=heat, 2=fan
      4: { capability: null, setting: 'preset' },
      16: { capability: 'target_temperature', transform: v => v / 10 },
      19: { capability: null, setting: 'max_temperature', transform: v => v / 10 },
      24: { capability: 'measure_temperature', transform: v => v / 10 },
    }
  },
  '_TZE200_b6wax7g0': { inherit: '_TZE200_chyvmhay' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // SIRENS / ALARMS
  // ═══════════════════════════════════════════════════════════════════════════════════════
  '_TZE200_d0yu2xgi': { // Siren with temp/humid
    type: 'siren',
    dpMappings: {
      101: { capability: 'measure_battery', transform: v => ({ 0: 10, 1: 50, 2: 100, 4: 100 }[v] ?? 50) },
      102: { capability: null, setting: 'alarm_melody' },
      103: { capability: null, setting: 'alarm_duration' },
      104: { capability: 'alarm_generic', transform: v => !!v },
      105: { capability: 'measure_temperature', transform: v => v },
      106: { capability: 'measure_humidity', transform: v => v },
      107: { capability: null, setting: 'min_alarm_temp' },
      108: { capability: null, setting: 'max_alarm_temp' },
      112: { capability: null, setting: 'temperature_unit' },
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // SMART PLUGS / SOCKETS
  // ═══════════════════════════════════════════════════════════════════════════════════════
  '_TZ3000_cphmq0q7': { // Energy monitoring plug
    type: 'plug_energy',
    dpMappings: {
      1: { capability: 'onoff', transform: v => !!v },
      17: { capability: 'measure_current', transform: v => v / 1000 },
      18: { capability: 'measure_power', transform: v => v / 10 },
      19: { capability: 'measure_voltage', transform: v => v / 10 },
      20: { capability: 'meter_power', transform: v => v / 100 },
    }
  },
  '_TZ3000_okaz9tjs': { inherit: '_TZ3000_cphmq0q7' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // SOIL SENSORS
  // ═══════════════════════════════════════════════════════════════════════════════════════
  '_TZE200_myd45weu': { // Soil moisture sensor
    type: 'soil',
    dpMappings: {
      3: { capability: 'measure_humidity', transform: v => v },  // soil moisture
      5: { capability: 'measure_temperature', transform: v => v / 10 },
      14: { capability: 'measure_battery', transform: v => ({ 0: 10, 1: 50, 2: 100 }[v] ?? 50) },
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// DRIVER TYPE TO DP FALLBACK (when no manufacturerName match)
// ═══════════════════════════════════════════════════════════════════════════════════════════
const DRIVER_TYPE_DP_MAPPINGS = {
  motion_sensor: {
    1: { capability: 'alarm_motion', transform: v => !!v },
    4: { capability: 'measure_battery', transform: v => Math.min(100, v) },
    5: { capability: 'alarm_tamper', transform: v => !!v },
    12: { capability: 'measure_luminance', transform: v => v },
  },
  motion_sensor_radar_mmwave: {
    1: { capability: 'alarm_motion', transform: v => !!v },
    101: { capability: 'alarm_motion', transform: v => v > 0 },
    106: { capability: 'measure_luminance', transform: v => v },
  },
  contact_sensor: {
    1: { capability: 'alarm_contact', transform: v => !!v },
    2: { capability: 'measure_battery', transform: v => Math.min(100, v) },
  },
  water_leak_sensor: {
    1: { capability: 'alarm_water', transform: v => !!v },
    4: { capability: 'measure_battery', transform: v => Math.min(100, v) },
  },
  temphumidsensor: {
    1: { capability: 'measure_temperature', transform: v => v / 10 },
    2: { capability: 'measure_humidity', transform: v => v },
    4: { capability: 'measure_battery', transform: v => Math.min(100, v) },
  },
  smoke_detector: {
    1: { capability: 'alarm_smoke', transform: v => !!v },
    14: { capability: 'measure_battery', transform: v => ({ 0: 10, 1: 50, 2: 100 }[v] ?? 50) },
  },
  thermostat: {
    1: { capability: 'onoff', transform: v => !!v },
    16: { capability: 'target_temperature', transform: v => v / 10 },
    24: { capability: 'measure_temperature', transform: v => v / 10 },
  },
  plug: {
    1: { capability: 'onoff', transform: v => !!v },
    17: { capability: 'measure_current', transform: v => v / 1000 },
    18: { capability: 'measure_power', transform: v => v / 10 },
    19: { capability: 'measure_voltage', transform: v => v / 10 },
  },
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * ZCL DEVICE PROFILES v5.5.142 - Context-aware ZCL cluster mappings by device type
 * IAS Zone (0x0500) zoneStatus interpretation varies by device type
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */
const ZCL_DEVICE_PROFILES = {
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // PIR MOTION SENSORS - IAS Zone bit 0 = motion
  // ═══════════════════════════════════════════════════════════════════════════════════════
  '_TZ3000_mcxw5ehu': { type: 'pir', iasZoneMapping: { alarm1: 'alarm_motion' } },
  '_TZ3000_6ygjfyll': { type: 'pir', iasZoneMapping: { alarm1: 'alarm_motion' } },
  '_TZ3000_bsvqrxru': { type: 'pir', iasZoneMapping: { alarm1: 'alarm_motion' } },
  '_TZ3000_msl6wxk9': { type: 'pir', iasZoneMapping: { alarm1: 'alarm_motion' } },
  '_TZ3000_otvn3lne': { type: 'pir', iasZoneMapping: { alarm1: 'alarm_motion' } },
  '_TZ3000_kmh5qpmb': { type: 'pir', iasZoneMapping: { alarm1: 'alarm_motion' } },
  '_TYZB01_zwvaj5wy': { type: 'pir', iasZoneMapping: { alarm1: 'alarm_motion' } },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // CONTACT SENSORS - IAS Zone bit 0 = contact open
  // ═══════════════════════════════════════════════════════════════════════════════════════
  '_TZ3000_26fmupbb': { type: 'contact', iasZoneMapping: { alarm1: 'alarm_contact' } },
  '_TZ3000_402jjyro': { type: 'contact', iasZoneMapping: { alarm1: 'alarm_contact' } },
  '_TZ3000_n2egfsli': { type: 'contact', iasZoneMapping: { alarm1: 'alarm_contact' } },
  '_TZ3000_oxslv1c9': { type: 'contact', iasZoneMapping: { alarm1: 'alarm_contact' } },
  '_TZ3000_2mbfxlzr': { type: 'contact', iasZoneMapping: { alarm1: 'alarm_contact' } },
  '_TZ3000_ebar6ljy': { type: 'contact', iasZoneMapping: { alarm1: 'alarm_contact' } },
  '_TYZB01_xph99wvr': { type: 'contact', iasZoneMapping: { alarm1: 'alarm_contact' } },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // WATER LEAK SENSORS - IAS Zone bit 0 = water detected
  // v5.5.601: Added HOBEIAN brand for Lasse_K water sensor fix
  // ═══════════════════════════════════════════════════════════════════════════════════════
  'HOBEIAN': { type: 'water', iasZoneMapping: { alarm1: 'alarm_water' }, brand: true },
  '_TZ3000_fxspvqra': { type: 'water', iasZoneMapping: { alarm1: 'alarm_water' } },
  '_TZ3000_kyb656no': { type: 'water', iasZoneMapping: { alarm1: 'alarm_water' } },
  '_TZ3000_upgcbody': { type: 'water', iasZoneMapping: { alarm1: 'alarm_water' } },
  '_TZ3000_k4ej3ww2': { type: 'water', iasZoneMapping: { alarm1: 'alarm_water' } },
  '_TZ3000_tsxgthcj': { type: 'water', iasZoneMapping: { alarm1: 'alarm_water' } },
  '_TZ3000_qdmnmddg': { type: 'water', iasZoneMapping: { alarm1: 'alarm_water' } },
  '_TYZB01_sqmd19i1': { type: 'water', iasZoneMapping: { alarm1: 'alarm_water' } },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // SMOKE DETECTORS - IAS Zone bit 0 = smoke detected
  // ═══════════════════════════════════════════════════════════════════════════════════════
  '_TZ3210_up3pngle': { type: 'smoke', iasZoneMapping: { alarm1: 'alarm_smoke' } },
  '_TZE200_ntcy3xu1': { type: 'smoke', iasZoneMapping: { alarm1: 'alarm_smoke' } },
  '_TZE200_m9skfctm': { type: 'smoke', iasZoneMapping: { alarm1: 'alarm_smoke' } },
  '_TZE200_rccxox8p': { type: 'smoke', iasZoneMapping: { alarm1: 'alarm_smoke' } },
  '_TZE200_vzekyi4c': { type: 'smoke', iasZoneMapping: { alarm1: 'alarm_smoke' } },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // GAS SENSORS - IAS Zone bit 0 = gas detected
  // ═══════════════════════════════════════════════════════════════════════════════════════
  '_TZE200_ggev5fsl': { type: 'gas', iasZoneMapping: { alarm1: 'alarm_gas' } },
  '_TZE200_yojqa8xn': { type: 'gas', iasZoneMapping: { alarm1: 'alarm_gas' } },
  '_TZE200_nhkuw3cz': { type: 'gas', iasZoneMapping: { alarm1: 'alarm_gas' } },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // CO DETECTORS - IAS Zone bit 0 = CO detected
  // ═══════════════════════════════════════════════════════════════════════════════════════
  '_TZE200_m6kdujbx': { type: 'co', iasZoneMapping: { alarm1: 'alarm_co' } },
  '_TZE200_3towulqd': { type: 'co', iasZoneMapping: { alarm1: 'alarm_co' } },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // VIBRATION SENSORS - IAS Zone bit 0 = vibration detected
  // ═══════════════════════════════════════════════════════════════════════════════════════
  '_TZ3000_bmg14ax8': { type: 'vibration', iasZoneMapping: { alarm1: 'alarm_vibration' } },
  '_TZ3000_fkxmyics': { type: 'vibration', iasZoneMapping: { alarm1: 'alarm_vibration' } },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // SOS BUTTONS - IAS ACE or IAS Zone
  // ═══════════════════════════════════════════════════════════════════════════════════════
  '_TZ3000_peszejy7': { type: 'sos', iasZoneMapping: { alarm1: 'alarm_sos' }, usesIasAce: true },
  '_TZ3000_fkp4yrjv': { type: 'sos', iasZoneMapping: { alarm1: 'alarm_sos' }, usesIasAce: true },
  '_TZ3000_p6ju8myv': { type: 'sos', iasZoneMapping: { alarm1: 'alarm_sos' }, usesIasAce: true },
  '_TYZB02_key8kk7r': { type: 'sos', iasZoneMapping: { alarm1: 'alarm_sos' }, usesIasAce: true },
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// DRIVER TYPE TO ZCL IAS ZONE MAPPING (when no manufacturerName match)
// ═══════════════════════════════════════════════════════════════════════════════════════════
const DRIVER_TYPE_ZCL_MAPPINGS = {
  motion_sensor: { iasZoneAlarm1: 'alarm_motion' },
  motion_sensor_radar_mmwave: { iasZoneAlarm1: 'alarm_motion' },
  contact_sensor: { iasZoneAlarm1: 'alarm_contact' },
  water_leak_sensor: { iasZoneAlarm1: 'alarm_water' },
  smoke_detector: { iasZoneAlarm1: 'alarm_smoke' },
  gas_sensor: { iasZoneAlarm1: 'alarm_gas' },
  co_sensor: { iasZoneAlarm1: 'alarm_co' },
  vibration_sensor: { iasZoneAlarm1: 'alarm_vibration' },
  sos_button: { iasZoneAlarm1: 'alarm_sos', usesIasAce: true },
};

/**
 * Get IAS Zone alarm capability based on device context
 * @param {string} manufacturerName - Device manufacturerName
 * @param {string} driverType - Driver type
 * @returns {string} - Capability name for IAS Zone alarm1 (default: 'alarm_contact')
 */
function getIasZoneCapability(manufacturerName, driverType) {
  // 1. Try manufacturerName specific profile
  const profile = ZCL_DEVICE_PROFILES[manufacturerName];
  if (profile && profile.iasZoneMapping && profile.iasZoneMapping.alarm1) {
    return profile.iasZoneMapping.alarm1;
  }

  // 2. Try driver type fallback
  if (driverType && DRIVER_TYPE_ZCL_MAPPINGS[driverType]) {
    return DRIVER_TYPE_ZCL_MAPPINGS[driverType].iasZoneAlarm1 || 'alarm_contact';
  }

  // 3. Default fallback
  return 'alarm_contact';
}

/**
 * Check if device uses IAS ACE cluster for button press
 * @param {string} manufacturerName - Device manufacturerName
 * @param {string} driverType - Driver type
 * @returns {boolean} - True if device uses IAS ACE
 */
function usesIasAceCluster(manufacturerName, driverType) {
  const profile = ZCL_DEVICE_PROFILES[manufacturerName];
  if (profile && profile.usesIasAce) return true;

  if (driverType && DRIVER_TYPE_ZCL_MAPPINGS[driverType]) {
    return DRIVER_TYPE_ZCL_MAPPINGS[driverType].usesIasAce || false;
  }

  return false;
}

/**
 * Get DP mapping for a specific device
 * @param {number} dp - Datapoint ID
 * @param {string} manufacturerName - Device manufacturerName (e.g., '_TZE200_2aaelwxk')
 * @param {string} productId - Device productId (e.g., 'TS0601')
 * @param {string} driverType - Driver type (e.g., 'motion_sensor')
 * @returns {object|null} - DP mapping or null if not found
 */
function getContextualDpMapping(dp, manufacturerName, productId, driverType) {
  // 1. Try manufacturerName specific profile
  let profile = DEVICE_PROFILES[manufacturerName];

  // Handle inheritance
  if (profile && profile.inherit) {
    profile = DEVICE_PROFILES[profile.inherit];
  }

  if (profile && profile.dpMappings && profile.dpMappings[dp]) {
    return { ...profile.dpMappings[dp], source: 'manufacturerName', deviceType: profile.type };
  }

  // 2. Try driver type fallback
  if (driverType && DRIVER_TYPE_DP_MAPPINGS[driverType] && DRIVER_TYPE_DP_MAPPINGS[driverType][dp]) {
    return { ...DRIVER_TYPE_DP_MAPPINGS[driverType][dp], source: 'driverType' };
  }

  // 3. Try universal fallback
  if (UNIVERSAL_DP_PATTERNS[dp]) {
    return { ...UNIVERSAL_DP_PATTERNS[dp], source: 'universal' };
  }

  return null;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * UNIVERSAL DP PATTERNS v5.5.142 - Fallback database when no device profile matches
 * Sources: Tuya Official Docs, Zigbee2MQTT, ZHA, Hubitat, Community
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */
const UNIVERSAL_DP_PATTERNS = {
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // DP1 - MULTI-PURPOSE (context-dependent based on device type)
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // - Temperature sensor: temperature (/10)
  // - Motion sensor: alarm_motion (0=no, 1=alarm) - Official Tuya PIR
  // - Contact sensor: alarm_contact (0=closed, 1=open) - Official Tuya
  // - Water leak: alarm_water (0=no, 1=leak) - Official Tuya
  // - Smoke detector: alarm_smoke (0=no, 1=alarm) - Official Tuya
  // - Presence radar: presence (boolean) - ZG-204ZM
  // - Switch: onoff (boolean)
  // - Thermostat: state (on/off)
  1: { capability: 'measure_temperature', transform: v => v / 10, pattern: 'temp-standard', multiUse: true },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // DP2 - MULTI-PURPOSE
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // - Temp/Humid sensor: humidity (%)
  // - Contact sensor: battery (%) - Official Tuya
  // - Thermostat: system_mode (0=cool, 1=heat, 2=fan_only)
  // - Radar: large_motion_detection_sensitivity (0-10)
  // - Dimmer: dim level (/1000)
  2: { capability: 'measure_humidity', transform: v => v, pattern: 'humid-standard', multiUse: true },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // DP3 - MULTI-PURPOSE
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // - Soil sensor: humidity/moisture (%)
  // - Luminance sensor: illuminance (lux)
  // - Radar mmWave: temperature (/10)
  // - Curtain: position (%)
  3: { capability: 'measure_humidity', transform: v => v, pattern: 'humid-soil', multiUse: true },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // DP4 - BATTERY / DISTANCE (Official Tuya: Battery for most sensors)
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // - PIR sensor: battery (%) - Official Tuya
  // - Water leak: battery (%) - Official Tuya
  // - Contact sensor: tamper alarm - Official Tuya
  // - Radar: large_motion_detection_distance (/100 = meters)
  // - Thermostat: preset (manual/auto)
  4: { capability: 'measure_battery', transform: v => Math.min(100, v), pattern: 'batt-official', multiUse: true },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // DP5 - BATTERY / TAMPER (Official Tuya)
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // - PIR sensor: tamper alarm (0=no, 1=alarm) - Official Tuya
  // - Water leak: tamper alarm - Official Tuya
  // - Temp/Humid: battery (%) - Official Tuya
  // - Soil sensor: temperature (/10 or /100)
  5: { capability: 'measure_battery', transform: v => Math.min(100, v), pattern: 'batt-dp5', multiUse: true },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // DP6-DP7 - HUMIDITY / LUMINANCE
  // ═══════════════════════════════════════════════════════════════════════════════════════
  6: { capability: 'measure_humidity', transform: v => v, pattern: 'humid-alt' },
  7: { capability: 'measure_luminance', transform: v => v, pattern: 'lux-dp7' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // DP9-DP13 - PIR SETTINGS / LUMINANCE
  // ═══════════════════════════════════════════════════════════════════════════════════════
  9: { capability: 'measure_luminance', transform: v => v, pattern: 'lux-pir', setting: 'o_sensitivity' },
  10: { capability: null, setting: 'v_sensitivity', pattern: 'pir-v-sens' },
  11: { capability: null, setting: 'maximum_range', pattern: 'radar-max-range' },
  12: { capability: 'measure_luminance', transform: v => v, pattern: 'lux-dp12' },
  13: { capability: null, setting: 'led_status', pattern: 'led-indicator' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // DP14-DP15 - BATTERY (Alternative DPs)
  // ═══════════════════════════════════════════════════════════════════════════════════════
  14: { capability: 'measure_battery', transform: v => ({ 0: 10, 1: 50, 2: 100 }[v] ?? 50), pattern: 'batt-state' },
  15: { capability: 'measure_battery', transform: v => Math.min(100, Math.max(0, v)), pattern: 'batt-pct' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // DP16-DP24 - THERMOSTAT / TRV (Official Tuya TV02, etc.)
  // ═══════════════════════════════════════════════════════════════════════════════════════
  16: { capability: 'target_temperature', transform: v => v / 10, pattern: 'setpoint' },
  17: { capability: 'measure_current', transform: v => v / 1000, pattern: 'current-mA' },
  18: { capability: 'measure_temperature', transform: v => v / 10, pattern: 'temp-local' },
  19: { capability: null, setting: 'max_temperature', pattern: 'trv-max-temp' },
  20: { capability: 'alarm_tamper', transform: v => !!v, pattern: 'tamper-dp20' },
  21: { capability: 'measure_voltage', transform: v => v / 1000, pattern: 'voltage-mV' },
  22: { capability: 'measure_co2', transform: v => v, pattern: 'co2-ppm' },
  23: { capability: 'measure_voc', transform: v => v, pattern: 'voc-ppb' },
  24: { capability: 'measure_temperature', transform: v => v / 10, pattern: 'temp-dp24' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // DP101-DP109 - RADAR / PRESENCE SENSOR (ZG-204ZM, mmWave, etc.)
  // Source: https://github.com/Koenkk/zigbee2mqtt/issues/21919
  // ═══════════════════════════════════════════════════════════════════════════════════════
  101: {
    capability: 'alarm_motion', transform: v => v > 0, pattern: 'motion-state',
    // motion_state: 0=none, 1=large, 2=medium, 3=small
    multiUse: true, altCapability: 'measure_battery'
  },
  102: {
    capability: 'measure_luminance', transform: v => v, pattern: 'lux-fantem',
    // Also: fading_time (seconds) for radar, distance (cm) for some
    multiUse: true, altSetting: 'fading_time'
  },
  103: {
    capability: 'measure_temperature', transform: v => v / 10, pattern: 'temp-fantem',
    // Also: illuminance (lux) for some radar sensors
    multiUse: true
  },
  104: {
    capability: 'measure_humidity', transform: v => v, pattern: 'humid-fantem',
    // Also: medium_motion_detection_distance (/100 = meters)
    multiUse: true, altSetting: 'fading_time'
  },
  105: {
    capability: 'measure_temperature', transform: v => v, pattern: 'temp-siren',
    // Also: medium_motion_detection_sensitivity (0-10)
    multiUse: true, altSetting: 'keep_time'
  },
  106: {
    capability: 'measure_luminance', transform: v => v, pattern: 'lux-radar',
    // ZG-204ZM: illuminance (lux) - CONFIRMED
    multiUse: true, altSetting: 'illuminance'
  },
  107: { capability: null, setting: 'indicator', pattern: 'led-indicator-dp107' },
  108: { capability: null, setting: 'small_detection_distance', pattern: 'radar-small-dist' },
  109: { capability: null, setting: 'small_detection_sensitivity', pattern: 'radar-small-sens' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // DP110-DP120 - ADVANCED SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════════════════
  110: { capability: null, setting: 'vacancy_delay', pattern: 'pir-vacancy-delay' },
  111: { capability: null, setting: 'light_on_luminance_prefer', pattern: 'pir-lux-on' },
  112: { capability: null, setting: 'light_off_luminance_prefer', pattern: 'pir-lux-off' },
  113: { capability: null, setting: 'mode', pattern: 'pir-mode' },
  114: { capability: null, setting: 'time', pattern: 'time-dp114' },
  115: { capability: null, setting: 'alarm_time', pattern: 'alarm-time' },
  116: { capability: null, setting: 'alarm_volume', pattern: 'alarm-volume' },
  117: { capability: null, setting: 'working_mode', pattern: 'working-mode' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // ENERGY MONITORING (Sockets, Plugs) - Higher DPs
  // ═══════════════════════════════════════════════════════════════════════════════════════
  132: { capability: 'measure_power', transform: v => v / 10, pattern: 'power-W-dp132' },
  133: { capability: 'measure_current', transform: v => v / 1000, pattern: 'current-mA-dp133' },
  134: { capability: 'meter_power', transform: v => v / 100, pattern: 'energy-kWh-dp134' },
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * UNIVERSAL ZCL CLUSTER MAPPINGS - All standard Zigbee clusters
 * Sources: Zigbee Cluster Library (ZCL) Specification, Zigbee2MQTT, ZHA
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */
const UNIVERSAL_ZCL_CLUSTERS = {
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // MEASUREMENT CLUSTERS
  // ═══════════════════════════════════════════════════════════════════════════════════════

  // 0x0402 - Temperature Measurement
  temperatureMeasurement: {
    clusterId: 0x0402,
    attribute: 'measuredValue',
    capability: 'measure_temperature',
    transform: v => Math.round((v / 100) * 10) / 10  // centidegrees to °C
  },

  // 0x0405 - Relative Humidity Measurement
  relativeHumidity: {
    clusterId: 0x0405,
    attribute: 'measuredValue',
    capability: 'measure_humidity',
    transform: v => Math.round(v / 100)  // centipercent to %
  },

  // 0x0400 - Illuminance Measurement
  illuminanceMeasurement: {
    clusterId: 0x0400,
    attribute: 'measuredValue',
    capability: 'measure_luminance',
    transform: v => v === 0 ? 0 : Math.round(Math.pow(10, (v - 1) / 10000))  // lux formula
  },

  // 0x0403 - Pressure Measurement
  pressureMeasurement: {
    clusterId: 0x0403,
    attribute: 'measuredValue',
    capability: 'measure_pressure',
    transform: v => v / 10  // hPa
  },

  // 0x040D - Carbon Dioxide (CO2) Measurement
  carbonDioxideMeasurement: {
    clusterId: 0x040D,
    attribute: 'measuredValue',
    capability: 'measure_co2',
    transform: v => v  // ppm
  },

  // 0x042A - PM2.5 Measurement
  pm25Measurement: {
    clusterId: 0x042A,
    attribute: 'measuredValue',
    capability: 'measure_pm25',
    transform: v => v  // µg/m³
  },

  // 0x042E - TVOC Measurement
  tvocMeasurement: {
    clusterId: 0x042E,
    attribute: 'measuredValue',
    capability: 'measure_voc',
    transform: v => v  // ppb
  },

  // 0x042B - Formaldehyde (HCHO) Measurement
  formaldehydeMeasurement: {
    clusterId: 0x042B,
    attribute: 'measuredValue',
    capability: 'measure_formaldehyde',
    transform: v => v / 1000  // mg/m³
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // POWER / BATTERY CLUSTERS
  // ═══════════════════════════════════════════════════════════════════════════════════════

  // 0x0001 - Power Configuration
  powerConfiguration: {
    clusterId: 0x0001,
    attributes: {
      batteryPercentageRemaining: { capability: 'measure_battery', transform: v => Math.min(100, Math.round(v / 2)) },
      batteryVoltage: { capability: 'measure_voltage', transform: v => v / 10 },  // decivolts to V
      batteryAlarmState: { capability: 'alarm_battery', transform: v => !!(v & 1) },
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // OCCUPANCY / MOTION CLUSTERS
  // ═══════════════════════════════════════════════════════════════════════════════════════

  // 0x0406 - Occupancy Sensing
  occupancySensing: {
    clusterId: 0x0406,
    attribute: 'occupancy',
    capability: 'alarm_motion',
    transform: v => !!(v & 1)
  },

  // 0x0500 - IAS Zone (Security sensors)
  iasZone: {
    clusterId: 0x0500,
    attribute: 'zoneStatus',
    capabilities: {
      alarm1: { capability: 'alarm_contact', transform: v => !!(v & 0x01) },
      alarm2: { capability: 'alarm_motion', transform: v => !!(v & 0x02) },
      tamper: { capability: 'alarm_tamper', transform: v => !!(v & 0x04) },
      lowBattery: { capability: 'alarm_battery', transform: v => !!(v & 0x08) },
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // ON/OFF / DIMMING CLUSTERS
  // ═══════════════════════════════════════════════════════════════════════════════════════

  // 0x0006 - On/Off
  onOff: {
    clusterId: 0x0006,
    attribute: 'onOff',
    capability: 'onoff',
    transform: v => !!v
  },

  // 0x0008 - Level Control
  levelControl: {
    clusterId: 0x0008,
    attribute: 'currentLevel',
    capability: 'dim',
    transform: v => v / 254  // 0-254 to 0-1
  },

  // 0x0300 - Color Control
  colorControl: {
    clusterId: 0x0300,
    attributes: {
      colorTemperatureMireds: { capability: 'light_temperature', transform: v => 1 - ((v - 153) / (500 - 153)) },
      currentHue: { capability: 'light_hue', transform: v => v / 254 },
      currentSaturation: { capability: 'light_saturation', transform: v => v / 254 },
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // ENERGY MONITORING CLUSTERS
  // ═══════════════════════════════════════════════════════════════════════════════════════

  // 0x0B04 - Electrical Measurement
  electricalMeasurement: {
    clusterId: 0x0B04,
    attributes: {
      activePower: { capability: 'measure_power', transform: v => v / 10 },  // W
      rmsCurrent: { capability: 'measure_current', transform: v => v / 1000 },  // A
      rmsVoltage: { capability: 'measure_voltage', transform: v => v / 10 },  // V
    }
  },

  // 0x0702 - Metering (Smart Energy)
  seMetering: {
    clusterId: 0x0702,
    attributes: {
      currentSummationDelivered: { capability: 'meter_power', transform: v => v / 1000 },  // kWh
      instantaneousDemand: { capability: 'measure_power', transform: v => v },  // W
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // WINDOW COVERING CLUSTER
  // ═══════════════════════════════════════════════════════════════════════════════════════

  // 0x0102 - Window Covering
  windowCovering: {
    clusterId: 0x0102,
    attributes: {
      currentPositionLiftPercentage: { capability: 'windowcoverings_set', transform: v => (100 - v) / 100 },
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // HVAC CLUSTERS
  // ═══════════════════════════════════════════════════════════════════════════════════════

  // 0x0201 - Thermostat
  thermostat: {
    clusterId: 0x0201,
    attributes: {
      localTemperature: { capability: 'measure_temperature', transform: v => v / 100 },
      occupiedHeatingSetpoint: { capability: 'target_temperature', transform: v => v / 100 },
      occupiedCoolingSetpoint: { capability: 'target_temperature', transform: v => v / 100 },
    }
  },

  // 0x0202 - Fan Control
  fanControl: {
    clusterId: 0x0202,
    attributes: {
      fanMode: { capability: 'fan_mode', transform: v => v },
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // DOOR LOCK CLUSTER
  // ═══════════════════════════════════════════════════════════════════════════════════════

  // 0x0101 - Door Lock
  doorLock: {
    clusterId: 0x0101,
    attributes: {
      lockState: { capability: 'locked', transform: v => v === 1 },
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // TIME CLUSTER
  // ═══════════════════════════════════════════════════════════════════════════════════════

  // 0x000A - Time
  time: {
    clusterId: 0x000A,
    attributes: {
      time: { capability: null, transform: v => v },  // Zigbee epoch (Jan 1, 2000)
      localTime: { capability: null, transform: v => v },
    }
  },
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * DEVICE TYPE SPECIFIC DP MAPPINGS
 * Different device types use same DP IDs for different purposes
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */
const DEVICE_TYPE_DP_MAPPINGS = {
  // Climate sensors (TH05Z, etc.)
  climate: {
    1: { capability: 'measure_temperature', divisor: 10 },
    2: { capability: 'measure_humidity', divisor: 1 },
    4: { capability: 'measure_battery', transform: v => Math.min(100, v * 2) },
  },

  // Soil sensors
  soil: {
    3: { capability: 'measure_humidity', divisor: 1 },  // soil moisture
    5: { capability: 'measure_temperature', divisor: 10 },
    15: { capability: 'measure_battery', divisor: 1 },
  },

  // Motion sensors (4-in-1)
  motion: {
    1: { capability: 'alarm_motion', transform: v => !!v },
    5: { capability: 'measure_temperature', divisor: 10 },
    6: { capability: 'measure_humidity', divisor: 1 },
    12: { capability: 'measure_luminance', divisor: 1 },
    15: { capability: 'measure_battery', divisor: 1 },
  },

  // Contact sensors
  contact: {
    1: { capability: 'alarm_contact', transform: v => !v },
    3: { capability: 'measure_battery', divisor: 1 },
  },

  // Smart plugs
  plug: {
    1: { capability: 'onoff', transform: v => !!v },
    17: { capability: 'measure_current', divisor: 1000 },
    18: { capability: 'measure_power', divisor: 10 },
    19: { capability: 'measure_voltage', divisor: 10 },
    20: { capability: 'meter_power', divisor: 100 },
  },

  // Dimmers
  dimmer: {
    1: { capability: 'onoff', transform: v => !!v },
    2: { capability: 'dim', divisor: 1000 },
  },

  // Curtain motors
  curtain: {
    1: { capability: 'windowcoverings_state', transform: v => ['up', 'idle', 'down'][v] || 'idle' },
    2: { capability: 'windowcoverings_set', divisor: 100 },
    3: { capability: 'windowcoverings_set', divisor: 100 },
  },

  // Thermostats
  thermostat: {
    2: { capability: 'target_temperature', divisor: 10 },
    3: { capability: 'measure_temperature', divisor: 10 },
    4: { capability: 'thermostat_mode', transform: v => v },
  },

  // Sirens
  siren: {
    104: { capability: 'alarm_generic', transform: v => !!v },
    105: { capability: 'measure_temperature', divisor: 10 },
    106: { capability: 'measure_humidity', divisor: 1 },
  },
};

/**
 * Parse Tuya raw frame with multiple strategies
 */
function parseTuyaFrame(buffer, logger = console.log) {
  if (!buffer || buffer.length < 4) return [];

  const hex = buffer.toString('hex');
  logger(`[TUYA-PARSE] 📦 Frame len=${buffer.length}, hex=${hex}`);

  // Try multiple parsing strategies
  const strategies = [
    { name: 'Format-A (header=5)', offset: 5 },
    { name: 'Format-B (header=4)', offset: 4 },
    { name: 'Format-C (header=3)', offset: 3 },
    { name: 'Format-D (header=2)', offset: 2 },
    { name: 'Format-E (header=0)', offset: 0 },
  ];

  for (const strategy of strategies) {
    if (buffer.length <= strategy.offset + 4) continue;

    const result = tryParseDPs(buffer, strategy.offset, logger);
    if (result.length > 0) {
      logger(`[TUYA-PARSE] ✅ ${strategy.name}: parsed ${result.length} DPs`);
      return result;
    }
  }

  // Last resort: scan for DP patterns
  logger('[TUYA-SCAN] 🔍 Scanning for DP patterns...');
  return scanForDPs(buffer, logger);
}

/**
 * Try to parse DPs from buffer at given offset
 */
function tryParseDPs(buffer, offset, logger) {
  const results = [];

  try {
    while (offset + 4 <= buffer.length) {
      const dpId = buffer.readUInt8(offset);
      const dpType = buffer.readUInt8(offset + 1);
      const length = buffer.readUInt16BE(offset + 2);

      // Validate DP structure
      if (dpId === 0 || dpId > 200) break;
      if (dpType > 5) break;
      if (length > 255 || (length === 0 && dpType !== TUYA_DP_TYPE.BOOL)) break;
      if (offset + 4 + length > buffer.length) break;

      const dataSlice = buffer.slice(offset + 4, offset + 4 + length);
      const value = parseDataSlice(dpType, dataSlice, length);

      if (value !== null) {
        logger(`[TUYA-DP] 📥 DP${dpId} type=${dpType} len=${length} → ${value}`);
        results.push({ dpId, dpType, value, raw: dataSlice });
      }

      offset += 4 + length;
    }
  } catch (e) {
    // Parse failed at this offset
  }

  return results;
}

/**
 * Parse data slice based on Tuya data type
 */
function parseDataSlice(dpType, dataSlice, length) {
  try {
    switch (dpType) {
    case TUYA_DP_TYPE.RAW:
      return dataSlice;

    case TUYA_DP_TYPE.BOOL:
      return length > 0 ? dataSlice.readUInt8(0) === 1 : false;

    case TUYA_DP_TYPE.VALUE:
      if (length === 4) return dataSlice.readInt32BE(0);
      if (length === 2) return dataSlice.readInt16BE(0);
      if (length === 1) return dataSlice.readInt8(0);
      return dataSlice.readIntBE(0, Math.min(length, 4));

    case TUYA_DP_TYPE.STRING:
      return dataSlice.toString('utf8').replace(/\0/g, '');

    case TUYA_DP_TYPE.ENUM:
      return dataSlice.readUInt8(0);

    case TUYA_DP_TYPE.BITMAP:
      if (length === 1) return dataSlice.readUInt8(0);
      if (length === 2) return dataSlice.readUInt16BE(0);
      if (length === 4) return dataSlice.readUInt32BE(0);
      return dataSlice;

    default:
      return dataSlice;
    }
  } catch (e) {
    return null;
  }
}

/**
 * Scan buffer for DP-like patterns (last resort)
 */
function scanForDPs(buffer, logger) {
  const results = [];

  for (let i = 0; i < buffer.length - 4; i++) {
    const dpId = buffer.readUInt8(i);
    const dpType = buffer.readUInt8(i + 1);
    const length = buffer.readUInt16BE(i + 2);

    if (dpId >= 1 && dpId <= 200 &&
      dpType >= 0 && dpType <= 5 &&
      length >= 0 && length <= 32 &&
      i + 4 + length <= buffer.length) {

      const dataSlice = buffer.slice(i + 4, i + 4 + length);
      const value = parseDataSlice(dpType, dataSlice, length);

      if (value !== null) {
        logger(`[TUYA-SCAN] 🎯 Found DP${dpId} at offset ${i}: ${value}`);
        results.push({ dpId, dpType, value, raw: dataSlice });
        i += 3 + length;
      }
    }
  }

  return results;
}

/**
 * Get universal DP mapping for auto-discovery
 */
function getUniversalDPMapping(dpId, value, hasCapability) {
  const pattern = UNIVERSAL_DP_PATTERNS[dpId];
  if (pattern && hasCapability(pattern.capability)) {
    return pattern;
  }

  // Value-based detection for unknown DPs
  if (typeof value === 'number') {
    if (value >= -400 && value <= 1000 && hasCapability('measure_temperature')) {
      return { capability: 'measure_temperature', transform: v => v / 10, pattern: 'auto-temp' };
    }
    if (value >= 0 && value <= 100 && hasCapability('measure_humidity')) {
      return { capability: 'measure_humidity', transform: v => v, pattern: 'auto-humid' };
    }
    if (value >= 0 && value <= 100 && hasCapability('measure_battery') && dpId >= 10) {
      return { capability: 'measure_battery', transform: v => v, pattern: 'auto-batt' };
    }
  }

  return null;
}

/**
 * Setup universal ZCL listeners on a device
 */
function setupUniversalZCLListeners(device, zclNode, customHandlers = {}) {
  device.log('[ZCL-UNIVERSAL] Setting up UNIVERSAL Zigbee cluster handlers...');

  for (const [epId, endpoint] of Object.entries(zclNode.endpoints || {})) {
    const availableClusters = Object.keys(endpoint.clusters || {});
    device.log(`[ZCL-UNIVERSAL] EP${epId} clusters: ${availableClusters.join(', ') || 'none'}`);

    for (const clusterName of availableClusters) {
      const cluster = endpoint.clusters[clusterName];
      if (!cluster || typeof cluster.on !== 'function') continue;

      const customHandler = customHandlers[clusterName];
      const universalHandler = UNIVERSAL_ZCL_CLUSTERS[clusterName];

      if (customHandler || universalHandler) {
        setupClusterListener(device, cluster, clusterName, epId, customHandler, universalHandler);
      } else {
        setupGenericClusterListener(device, cluster, clusterName, epId);
      }
    }
  }
}

/**
 * Setup listener for a specific cluster
 */
function setupClusterListener(device, cluster, clusterName, epId, customHandler, universalHandler) {
  try {
    cluster.on('attr', (attrName, value) => {
      device.log(`[ZCL] 📥 ${clusterName}.${attrName} = ${value}`);

      if (customHandler?.attributeReport) {
        customHandler.attributeReport.call(device, { [attrName]: value });
        return;
      }

      if (universalHandler && universalHandler.capability) {
        if (attrName === universalHandler.attribute || !universalHandler.attribute) {
          const finalValue = universalHandler.transform(value);
          device.log(`[ZCL-AUTO] 🔮 ${clusterName}.${attrName} → ${universalHandler.capability} = ${finalValue}`);

          if (device.hasCapability(universalHandler.capability)) {
            device.setCapabilityValue(universalHandler.capability, finalValue).catch(err => {
              device.error(`[ZCL] Failed to set ${universalHandler.capability}:`, err.message);
            });
          }
        }
      }
    });

    cluster.on('report', (data) => {
      device.log(`[ZCL] 📋 ${clusterName} report:`, JSON.stringify(data));
    });

    device.log(`[ZCL-UNIVERSAL] ✅ ${clusterName} listener on EP${epId}`);
  } catch (e) {
    device.log(`[ZCL-UNIVERSAL] ⚠️ ${clusterName} setup failed:`, e.message);
  }
}

/**
 * Generic listener for unknown clusters
 */
function setupGenericClusterListener(device, cluster, clusterName, epId) {
  try {
    cluster.on('attr', (attrName, value) => {
      device.log(`[ZCL-GENERIC] 📦 ${clusterName}.${attrName} = ${value}`);
    });
    device.log(`[ZCL-GENERIC] 👀 Watching ${clusterName} on EP${epId}`);
  } catch (e) {
    // Ignore errors
  }
}

/**
 * Get device-type specific DP mapping
 */
function getDeviceTypeDPMapping(deviceType, dpId) {
  const deviceMappings = DEVICE_TYPE_DP_MAPPINGS[deviceType];
  return deviceMappings?.[dpId] || null;
}

/**
 * Build Tuya time sync payload
 * @param {Date} date - Date to sync
 * @returns {Buffer} - Time sync frame
 */
function buildTimeSyncPayload(date = new Date()) {
  const utcSeconds = Math.floor(date.getTime() / 1000);
  const localSeconds = utcSeconds + (-date.getTimezoneOffset() * 60);

  // Tuya time sync: [seq:2][cmd:1][len:2][utc:4][local:4]
  const frame = Buffer.alloc(13);
  frame.writeUInt16BE(0x0000, 0);  // seq
  frame.writeUInt8(TUYA_COMMANDS.TIME_SYNC, 2);  // cmd = 0x24
  frame.writeUInt16BE(8, 3);  // len = 8 bytes
  frame.writeUInt32BE(utcSeconds, 5);
  frame.writeUInt32BE(localSeconds, 9);

  return frame;
}

/**
 * Build Tuya data query payload
 * @param {number} seq - Sequence number
 * @returns {Buffer} - Data query frame
 */
function buildDataQueryPayload(seq = 0) {
  const frame = Buffer.alloc(3);
  frame.writeUInt16BE(seq, 0);  // seq
  frame.writeUInt8(TUYA_COMMANDS.DEVICE_STATUS, 2);  // cmd = 0x02
  return frame;
}

/**
 * Build MCU version request (Magic Packet)
 * @param {number} seq - Sequence number
 * @returns {Buffer} - MCU version request frame
 */
function buildMCUVersionRequest(seq = 0) {
  const frame = Buffer.alloc(3);
  frame.writeUInt16BE(seq, 0);  // seq
  frame.writeUInt8(TUYA_COMMANDS.MCU_VERSION, 2);  // cmd = 0x10
  return frame;
}

module.exports = {
  // Constants
  TUYA_DP_TYPE,
  TUYA_COMMANDS,
  UNIVERSAL_DP_PATTERNS,
  UNIVERSAL_ZCL_CLUSTERS,
  DEVICE_TYPE_DP_MAPPINGS,

  // Device Profiles v5.5.142 - Context-aware DP mapping
  DEVICE_PROFILES,
  DRIVER_TYPE_DP_MAPPINGS,
  getContextualDpMapping,

  // ZCL Device Profiles v5.5.142 - Context-aware ZCL mapping
  ZCL_DEVICE_PROFILES,
  DRIVER_TYPE_ZCL_MAPPINGS,
  getIasZoneCapability,
  usesIasAceCluster,

  // Parsing functions
  parseTuyaFrame,
  tryParseDPs,
  parseDataSlice,
  scanForDPs,

  // Mapping functions
  getUniversalDPMapping,
  getDeviceTypeDPMapping,

  // ZCL setup
  setupUniversalZCLListeners,
  setupClusterListener,
  setupGenericClusterListener,

  // Tuya frame builders
  buildTimeSyncPayload,
  buildDataQueryPayload,
  buildMCUVersionRequest,
};
