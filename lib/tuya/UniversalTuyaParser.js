'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                    UNIVERSAL TUYA PARSER v5.5.88                                         ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                          ║
 * ║  Shared module for intelligent Tuya data parsing across ALL drivers                      ║
 * ║                                                                                          ║
 * ║  Features:                                                                               ║
 * ║  - Multi-format frame parsing (5 strategies)                                             ║
 * ║  - Auto-discovery of unknown DPs                                                         ║
 * ║  - Universal DP patterns from Z2M/ZHA/Community/Tuya Official Docs                       ║
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
 * UNIVERSAL DP PATTERNS - Comprehensive database from all community sources
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */
const UNIVERSAL_DP_PATTERNS = {
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // TEMPERATURE - Multiple DP IDs used by different device types
  // ═══════════════════════════════════════════════════════════════════════════════════════
  1: { capability: 'measure_temperature', transform: v => v / 10, pattern: 'temp-standard' },
  5: { capability: 'measure_temperature', transform: v => v > 1000 ? v / 100 : v / 10, pattern: 'temp-soil' },
  18: { capability: 'measure_temperature', transform: v => v / 10, pattern: 'temp-alt' },
  24: { capability: 'measure_temperature', transform: v => v / 10, pattern: 'temp-dp24' },
  103: { capability: 'measure_temperature', transform: v => v / 10, pattern: 'temp-fantem' },
  105: { capability: 'measure_temperature', transform: v => v, pattern: 'temp-siren' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // HUMIDITY - Multiple DP IDs
  // ═══════════════════════════════════════════════════════════════════════════════════════
  2: { capability: 'measure_humidity', transform: v => v, pattern: 'humid-standard' },
  3: { capability: 'measure_humidity', transform: v => v, pattern: 'humid-soil' },
  6: { capability: 'measure_humidity', transform: v => v, pattern: 'humid-alt' },
  19: { capability: 'measure_humidity', transform: v => v, pattern: 'humid-dp19' },
  104: { capability: 'measure_humidity', transform: v => v, pattern: 'humid-fantem' },
  106: { capability: 'measure_humidity', transform: v => v, pattern: 'humid-siren' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // BATTERY - State enum or percentage
  // ═══════════════════════════════════════════════════════════════════════════════════════
  4: { capability: 'measure_battery', transform: v => Math.min(100, v * 2), pattern: 'batt-x2' },
  14: { capability: 'measure_battery', transform: v => ({ 0: 10, 1: 50, 2: 100 }[v] ?? 50), pattern: 'batt-state' },
  15: { capability: 'measure_battery', transform: v => Math.min(100, Math.max(0, v)), pattern: 'batt-pct' },
  101: { capability: 'measure_battery', transform: v => ({ 0: 10, 1: 50, 2: 100 }[v] ?? v), pattern: 'batt-siren' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // ON/OFF - Switch state
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // 1: also used for onoff in switches/plugs (context-dependent, handled separately)
  20: { capability: 'onoff', transform: v => !!v, pattern: 'onoff-dp20' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // ILLUMINANCE / LUX
  // ═══════════════════════════════════════════════════════════════════════════════════════
  7: { capability: 'measure_luminance', transform: v => v, pattern: 'lux-dp7' },
  9: { capability: 'measure_luminance', transform: v => v, pattern: 'lux-pir-sensitivity' },
  12: { capability: 'measure_luminance', transform: v => v, pattern: 'lux-dp12' },
  102: { capability: 'measure_luminance', transform: v => v, pattern: 'lux-fantem' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // MOTION / OCCUPANCY
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // 1: also used for motion in PIR sensors (context-dependent)
  // 101: can be motion in some devices

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // CONTACT SENSOR
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // 1: also used for contact state (context-dependent)

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // VOLTAGE / CURRENT / POWER - Energy monitoring
  // ═══════════════════════════════════════════════════════════════════════════════════════
  17: { capability: 'measure_current', transform: v => v / 1000, pattern: 'current-mA' },
  18: { capability: 'measure_power', transform: v => v / 10, pattern: 'power-W' },
  19: { capability: 'measure_voltage', transform: v => v / 10, pattern: 'voltage-V' },
  20: { capability: 'meter_power', transform: v => v / 100, pattern: 'energy-kWh' },
  21: { capability: 'measure_voltage', transform: v => v / 1000, pattern: 'voltage-mV' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // AIR QUALITY - CO2, PM2.5, VOC, Formaldehyde
  // ═══════════════════════════════════════════════════════════════════════════════════════
  22: { capability: 'measure_co2', transform: v => v, pattern: 'co2-ppm' },
  20: { capability: 'measure_pm25', transform: v => v, pattern: 'pm25' },
  23: { capability: 'measure_voc', transform: v => v, pattern: 'voc-ppb' },
  21: { capability: 'measure_formaldehyde', transform: v => v / 100, pattern: 'hcho' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // CURTAIN / BLIND MOTOR
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // 1: { capability: 'windowcoverings_state', transform: v => ['up','idle','down'][v] || 'idle', pattern: 'curtain-cmd' },
  // 2: { capability: 'windowcoverings_set', transform: v => v / 100, pattern: 'curtain-pct' },
  // 3: { capability: 'windowcoverings_set', transform: v => v / 100, pattern: 'curtain-pos' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // DIMMER / LEVEL CONTROL
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // 2: { capability: 'dim', transform: v => v / 1000, pattern: 'dim-1000' },
  // 3: { capability: 'light_temperature', transform: v => 1 - v / 1000, pattern: 'cct-1000' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // SIREN / ALARM - Specific DPs (Source: zigbeefordomoticz wiki)
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // 101 (0x65): Power Mode (0=battery, 4=DC)
  // 102 (0x66): Alarm Melody
  // 103 (0x67): Alarm Duration
  // 104 (0x68): Alarm On/Off
  // 108 (0x6C): Max Alarm Temperature
  // 112 (0x70): Temperature Unit

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // THERMOSTAT / TRV
  // ═══════════════════════════════════════════════════════════════════════════════════════
  16: { capability: 'target_temperature', transform: v => v / 10, pattern: 'setpoint' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // WATER LEAK
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // 1: { capability: 'alarm_water', transform: v => !!v, pattern: 'water-leak' },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // SMOKE / GAS / CO
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // 1: { capability: 'alarm_smoke', transform: v => !!v, pattern: 'smoke' },
  // 1: { capability: 'alarm_co', transform: v => !!v, pattern: 'co' },
  // 1: { capability: 'alarm_gas', transform: v => !!v, pattern: 'gas' },
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
