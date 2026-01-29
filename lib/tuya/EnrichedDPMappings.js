'use strict';

/**
 * EnrichedDPMappings - v5.5.386
 *
 * COMPREHENSIVE DP MAPPINGS from community research:
 * - Zigbee2MQTT (zigbee-herdsman-converters)
 * - ZHA (zha-device-handlers quirks)
 * - Blakadder Zigbee database
 * - Tuya official DP documentation
 *
 * MANUFACTURER NAME PATTERNS:
 * ┌─────────────┬─────────────────────────────────────────────────────────────┐
 * │ Pattern     │ Description                                                 │
 * ├─────────────┼─────────────────────────────────────────────────────────────┤
 * │ _TZE200_*   │ Tuya MCU v1 (TS0601) - uses 0xEF00 cluster                 │
 * │ _TZE204_*   │ Tuya MCU v2 (TS0601) - uses 0xEF00 cluster                 │
 * │ _TZE284_*   │ Tuya MCU v3 (TS0601) - uses 0xEF00 cluster, newer          │
 * │ _TZ3000_*   │ Standard Zigbee - uses ZCL clusters (genOnOff, etc.)       │
 * │ _TZ3210_*   │ Standard Zigbee v2 - uses ZCL clusters                     │
 * │ _TYZB01_*   │ Legacy Zigbee - mixed cluster support                      │
 * └─────────────┴─────────────────────────────────────────────────────────────┘
 *
 * DP DATA TYPES:
 * - 0x00 (RAW): Raw bytes
 * - 0x01 (BOOL): Boolean (0/1)
 * - 0x02 (VALUE): 4-byte integer (Big Endian)
 * - 0x03 (STRING): Variable length string
 * - 0x04 (ENUM): 1-byte enumeration
 * - 0x05 (BITMAP): 1/2/4 byte bitmap
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONVERTERS - Transform raw DP values to Homey capabilities
// ═══════════════════════════════════════════════════════════════════════════

const CONVERTERS = {
  // Direct passthrough
  raw: (v) => v,

  // Boolean converters
  boolean: (v) => Boolean(v),
  booleanInvert: (v) => !Boolean(v),

  // Numeric converters
  divideBy10: (v) => Number(v) / 10,
  divideBy100: (v) => Number(v) / 100,
  divideBy1000: (v) => Number(v) / 1000,
  multiplyBy2: (v) => Number(v) * 2,  // Battery 0-50 → 0-100

  // Temperature converters (various formats)
  tempCelsius: (v) => Number(v) / 10,        // Decidegree to degree
  tempCelsius100: (v) => Number(v) / 100,    // Centidegree to degree
  tempFahrenheitToCelsius: (v) => (Number(v) / 10 - 32) * 5 / 9,

  // Humidity converters
  humidityPercent: (v) => Math.min(100, Math.max(0, Number(v))),
  humidityDivide10: (v) => Number(v) / 10,

  // Battery converters
  batteryPercent: (v) => Math.min(100, Math.max(0, Number(v))),
  batteryDouble: (v) => Math.min(100, Number(v) * 2),  // 0-50 → 0-100
  batteryVoltage: (v) => Number(v) / 1000,  // mV to V

  // Illuminance converters
  illuminanceLux: (v) => Number(v),
  illuminanceLog: (v) => Math.pow(10, (Number(v) / 10000) - 1),  // ZCL log scale

  // Position converters (curtains/covers)
  positionPercent: (v) => Math.min(100, Math.max(0, Number(v))),
  positionInvert: (v) => 100 - Math.min(100, Math.max(0, Number(v))),

  // Distance converters (radar)
  distanceMeters: (v) => Number(v) / 100,
  distanceCentimeters: (v) => Number(v),

  // Time converters
  timeSeconds: (v) => Number(v),
  timeMinutes: (v) => Number(v) / 60,

  // Power converters
  powerWatts: (v) => Number(v) / 10,
  powerWatts100: (v) => Number(v) / 100,
  energyKwh: (v) => Number(v) / 100,
  energyKwh1000: (v) => Number(v) / 1000,
  voltageVolts: (v) => Number(v) / 10,
  currentAmps: (v) => Number(v) / 1000,

  // Enum converters
  enum: (v, mapping) => mapping?.[v] ?? v,
};

// ═══════════════════════════════════════════════════════════════════════════
// CLIMATE SENSORS - Temperature/Humidity
// Source: Z2M tuya.ts + ZHA quirks
// ═══════════════════════════════════════════════════════════════════════════

const CLIMATE_SENSOR_DPS = {
  // Standard Tuya climate sensor DPs
  STANDARD: {
    1: { capability: 'measure_temperature', converter: 'divideBy10', type: 'VALUE', name: 'temperature' },
    2: { capability: 'measure_humidity', converter: 'raw', type: 'VALUE', name: 'humidity' },
    4: { capability: 'measure_battery', converter: 'raw', type: 'VALUE', name: 'battery' },
    9: { capability: null, converter: 'enum', type: 'ENUM', name: 'temperature_unit', values: { 0: 'celsius', 1: 'fahrenheit' } },
  },

  // _TZE284_ series (newer MCU)
  TZE284: {
    1: { capability: 'measure_temperature', converter: 'divideBy10', type: 'VALUE', name: 'temperature' },
    2: { capability: 'measure_humidity', converter: 'raw', type: 'VALUE', name: 'humidity' },
    4: { capability: 'measure_battery', converter: 'multiplyBy2', type: 'VALUE', name: 'battery' }, // 0-50 → 0-100
    9: { capability: null, converter: 'enum', type: 'ENUM', name: 'temperature_unit' },
    10: { capability: null, converter: 'divideBy10', type: 'VALUE', name: 'max_temp_alarm' },
    11: { capability: null, converter: 'divideBy10', type: 'VALUE', name: 'min_temp_alarm' },
    12: { capability: null, converter: 'raw', type: 'VALUE', name: 'max_humidity_alarm' },
    13: { capability: null, converter: 'raw', type: 'VALUE', name: 'min_humidity_alarm' },
    14: { capability: 'alarm_generic', converter: 'enum', type: 'ENUM', name: 'temp_alarm', values: { 0: 'lower', 1: 'upper', 2: 'cancel' } },
    15: { capability: 'alarm_generic', converter: 'enum', type: 'ENUM', name: 'humidity_alarm', values: { 0: 'lower', 1: 'upper', 2: 'cancel' } },
  },

  // Round LCD sensors (ZTH01, ZTH02)
  LCD_ROUND: {
    1: { capability: 'measure_temperature', converter: 'divideBy10', type: 'VALUE', name: 'temperature' },
    2: { capability: 'measure_humidity', converter: 'raw', type: 'VALUE', name: 'humidity' },
    4: { capability: 'measure_battery', converter: 'raw', type: 'VALUE', name: 'battery' },
    9: { capability: null, converter: 'enum', type: 'ENUM', name: 'temperature_unit' },
    17: { capability: null, converter: 'raw', type: 'VALUE', name: 'temp_report_interval' },
    18: { capability: null, converter: 'raw', type: 'VALUE', name: 'humidity_report_interval' },
    19: { capability: null, converter: 'divideBy10', type: 'VALUE', name: 'temp_sensitivity' },
    20: { capability: null, converter: 'raw', type: 'VALUE', name: 'humidity_sensitivity' },
    101: { capability: null, converter: 'enum', type: 'ENUM', name: 'time_format', values: { 0: '12h', 1: '24h' } },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SOIL SENSORS
// Source: Z2M #26734, ZHA quirks
// ═══════════════════════════════════════════════════════════════════════════

const SOIL_SENSOR_DPS = {
  // _TZE284_myd45weu, _TZE284_aao3yzhs
  STANDARD: {
    2: { capability: null, converter: 'enum', type: 'ENUM', name: 'temperature_unit' },
    3: { capability: 'measure_humidity', converter: 'raw', type: 'VALUE', name: 'soil_moisture' },
    5: { capability: 'measure_temperature', converter: 'divideBy10', type: 'VALUE', name: 'temperature' },
    14: { capability: null, converter: 'enum', type: 'ENUM', name: 'battery_state', values: { 0: 'low', 1: 'medium', 2: 'high' } },
    15: { capability: 'measure_battery', converter: 'multiplyBy2', type: 'VALUE', name: 'battery' },
  },

  // Alternative mapping (some models)
  ALT: {
    3: { capability: 'measure_humidity', converter: 'divideBy100', type: 'VALUE', name: 'soil_moisture' },
    5: { capability: 'measure_temperature', converter: 'divideBy100', type: 'VALUE', name: 'temperature' },
    15: { capability: 'measure_battery', converter: 'multiplyBy2', type: 'VALUE', name: 'battery' },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// PRESENCE/RADAR SENSORS
// Source: Z2M tuya.ts fp-moe, ZY-M100, ZG-204ZM
// ═══════════════════════════════════════════════════════════════════════════

const PRESENCE_SENSOR_DPS = {
  // ZY-M100 style radars (_TZE200_ar0slwnd)
  ZY_M100: {
    1: { capability: 'alarm_motion', converter: 'boolean', type: 'BOOL', name: 'presence' },
    2: { capability: null, converter: 'raw', type: 'VALUE', name: 'sensitivity', min: 0, max: 9 },
    3: { capability: null, converter: 'divideBy100', type: 'VALUE', name: 'min_range' },
    4: { capability: null, converter: 'divideBy100', type: 'VALUE', name: 'max_range' },
    9: { capability: null, converter: 'divideBy100', type: 'VALUE', name: 'target_distance' },
    101: { capability: null, converter: 'raw', type: 'VALUE', name: 'detection_delay' },
    102: { capability: null, converter: 'raw', type: 'VALUE', name: 'fading_time' },
    104: { capability: 'measure_luminance', converter: 'raw', type: 'VALUE', name: 'illuminance' },
  },

  // ZG-204ZM multi-sensor (_TZE200_rhgsbacq)
  // v5.5.821: Updated from JohanBendz PR #1306 + Hubitat deviceProfileV4
  ZG_204ZM: {
    1: { capability: 'alarm_motion', converter: 'boolean', type: 'BOOL', name: 'presence' },
    4: { capability: 'measure_battery', converter: 'raw', type: 'VALUE', name: 'battery' },
    9: { capability: null, converter: 'raw', type: 'VALUE', name: 'sensitivity' },
    15: { capability: 'measure_battery', converter: 'raw', type: 'VALUE', name: 'battery_alt' },
    101: { capability: 'measure_humidity', converter: 'divideBy10', type: 'VALUE', name: 'humidity' },
    102: { capability: null, converter: 'raw', type: 'VALUE', name: 'illuminance_interval' },
    103: { capability: null, converter: 'raw', type: 'VALUE', name: 'temp_sensitivity' },
    104: { capability: null, converter: 'raw', type: 'VALUE', name: 'humidity_sensitivity' },
    105: { capability: null, converter: 'raw', type: 'VALUE', name: 'temp_report_interval' },
    106: { capability: 'measure_luminance', converter: 'raw', type: 'VALUE', name: 'illuminance' },
    107: { capability: null, converter: 'raw', type: 'VALUE', name: 'humidity_report_interval' },
    111: { capability: 'measure_temperature', converter: 'divideBy10', type: 'VALUE', name: 'temperature' },
  },

  // v5.5.821: HOBEIAN 10G Multi-sensor from PR #1306
  // Source: https://github.com/kkossev/Hubitat/blob/deviceProfileV4/Drivers/Tuya%20Zigbee%20mmWave%20Sensor/deviceProfilesV4_mmWave.json
  HOBEIAN_10G: {
    1: { capability: 'alarm_motion', converter: 'boolean', type: 'BOOL', name: 'presence' },
    9: { capability: null, converter: 'raw', type: 'VALUE', name: 'sensitivity', min: 1, max: 9 },
    101: { capability: 'measure_humidity', converter: 'divideBy10', type: 'VALUE', name: 'humidity' },
    106: { capability: 'measure_luminance', converter: 'raw', type: 'VALUE', name: 'illuminance' },
    111: { capability: 'measure_temperature', converter: 'divideBy10', type: 'VALUE', name: 'temperature' },
  },

  // v5.5.953: HOBEIAN ZG-204ZL/ZG-204ZV Multi-sensor (PIR + Temp/Humidity)
  // Peter_van_Werkhoven #1265: Humidity showing 9% instead of 90% - uses RAW values (no divisor)
  // Source: Forum feedback, Z2M GitHub #12364
  ZG_204ZL: {
    1: { capability: 'alarm_motion', converter: 'boolean', type: 'BOOL', name: 'occupancy' },
    2: { capability: 'measure_humidity', converter: 'raw', type: 'VALUE', name: 'humidity' },
    3: { capability: 'measure_temperature', converter: 'divideBy10', type: 'VALUE', name: 'temperature' },
    4: { capability: 'measure_battery', converter: 'raw', type: 'VALUE', name: 'battery' },
    9: { capability: null, converter: 'raw', type: 'VALUE', name: 'sensitivity' },
    10: { capability: null, converter: 'raw', type: 'VALUE', name: 'keep_time' },
    12: { capability: 'measure_luminance', converter: 'raw', type: 'VALUE', name: 'illuminance' },
    101: { capability: 'measure_humidity', converter: 'raw', type: 'VALUE', name: 'humidity_alt' },
    111: { capability: 'measure_temperature', converter: 'divideBy10', type: 'VALUE', name: 'temperature_alt' },
  },

  // FP1/FP2 style radars (_TZE204_ztc6ggyl)
  FP_STYLE: {
    1: { capability: 'alarm_motion', converter: 'boolean', type: 'BOOL', name: 'presence' },
    2: { capability: null, converter: 'raw', type: 'VALUE', name: 'sensitivity' },
    3: { capability: null, converter: 'raw', type: 'VALUE', name: 'keep_time' },
    4: { capability: null, converter: 'divideBy100', type: 'VALUE', name: 'detection_distance' },
    6: { capability: null, converter: 'enum', type: 'ENUM', name: 'motion_state', values: { 0: 'none', 1: 'large', 2: 'small', 3: 'breathing' } },
    9: { capability: null, converter: 'divideBy100', type: 'VALUE', name: 'distance' },
    102: { capability: 'measure_luminance', converter: 'raw', type: 'VALUE', name: 'illuminance' },
    104: { capability: null, converter: 'enum', type: 'ENUM', name: 'indicator' },
  },

  // mmWave radars (_TZE204_sxm7l9xa)
  MMWAVE: {
    1: { capability: 'alarm_motion', converter: 'boolean', type: 'BOOL', name: 'presence' },
    2: { capability: null, converter: 'raw', type: 'VALUE', name: 'sensitivity', min: 1, max: 10 },
    3: { capability: null, converter: 'raw', type: 'VALUE', name: 'keep_time' },
    4: { capability: null, converter: 'divideBy100', type: 'VALUE', name: 'max_distance' },
    101: { capability: null, converter: 'enum', type: 'ENUM', name: 'presence_state', values: { 0: 'none', 1: 'presence' } },
    102: { capability: 'measure_luminance', converter: 'raw', type: 'VALUE', name: 'illuminance' },
    103: { capability: null, converter: 'divideBy100', type: 'VALUE', name: 'target_distance' },
  },

  // v5.5.518: LeapMMW 5.8G radar (_TZ321C_fkzihax8, _TZ321C_4slreunp)
  // Source: Z2M #23853, #23913 - Uses IAS Zone + Tuya DPs hybrid
  // Device reports occupancy via IAS Zone (1280) AND radar data via Tuya DPs
  LEAPMW_5G8: {
    101: { capability: null, converter: 'raw', type: 'VALUE', name: 'entry_sensitivity', min: 10, max: 100 },
    102: { capability: null, converter: 'divideBy100', type: 'VALUE', name: 'entry_distance' },
    103: { capability: null, converter: 'raw', type: 'VALUE', name: 'departure_delay', min: 5, max: 7200 },
    104: { capability: null, converter: 'divideBy100', type: 'VALUE', name: 'entry_filter_time' },
    105: { capability: null, converter: 'divideBy10', type: 'VALUE', name: 'block_time' },
    107: { capability: 'measure_luminance', converter: 'divideBy10', type: 'VALUE', name: 'illuminance' },
    108: { capability: null, converter: 'enum', type: 'ENUM', name: 'debug_mode', values: { 0: 'off', 1: 'on' } },
    109: { capability: 'measure_distance', converter: 'divideBy100', type: 'VALUE', name: 'debug_distance' },
    110: { capability: null, converter: 'raw', type: 'VALUE', name: 'debug_countdown' },
    111: { capability: null, converter: 'enum', type: 'ENUM', name: 'radar_scene', values: { 0: 'custom', 1: 'toilet', 2: 'kitchen', 3: 'hallway', 4: 'bedroom', 5: 'livingroom', 6: 'meetingroom', 7: 'default' } },
    112: { capability: null, converter: 'enum', type: 'ENUM', name: 'sensor_mode', values: { 0: 'normal', 1: 'occupied', 2: 'unoccupied' } },
    114: { capability: null, converter: 'enum', type: 'ENUM', name: 'status_indication', values: { 0: 'off', 1: 'on' } },
    115: { capability: null, converter: 'raw', type: 'VALUE', name: 'radar_sensitivity', min: 10, max: 100 },
    116: { capability: null, converter: 'divideBy100', type: 'VALUE', name: 'minimum_range' },
    117: { capability: null, converter: 'divideBy100', type: 'VALUE', name: 'maximum_range' },
    119: { capability: 'measure_distance', converter: 'divideBy100', type: 'VALUE', name: 'target_distance' },
    120: { capability: null, converter: 'enum', type: 'ENUM', name: 'distance_report_mode', values: { 0: 'normal', 1: 'occupancy_detection' } },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// THERMOSTATS / TRV
// Source: Z2M tuya_thermostat
// ═══════════════════════════════════════════════════════════════════════════

const THERMOSTAT_DPS = {
  // Standard TRV (_TZE200_ckud7u2l)
  TRV_STANDARD: {
    2: { capability: 'target_temperature', converter: 'divideBy10', type: 'VALUE', name: 'target_temp' },
    3: { capability: 'measure_temperature', converter: 'divideBy10', type: 'VALUE', name: 'current_temp' },
    4: { capability: null, converter: 'enum', type: 'ENUM', name: 'mode', values: { 0: 'off', 1: 'manual', 2: 'auto', 3: 'comfort', 4: 'eco' } },
    7: { capability: null, converter: 'boolean', type: 'BOOL', name: 'child_lock' },
    13: { capability: 'measure_battery', converter: 'raw', type: 'VALUE', name: 'battery' },
    14: { capability: null, converter: 'raw', type: 'VALUE', name: 'valve_position' },
    101: { capability: null, converter: 'boolean', type: 'BOOL', name: 'window_detection' },
    102: { capability: null, converter: 'boolean', type: 'BOOL', name: 'window_open' },
    103: { capability: null, converter: 'boolean', type: 'BOOL', name: 'boost' },
    104: { capability: null, converter: 'raw', type: 'VALUE', name: 'valve_position_alt' },
  },

  // Wall thermostat (_TZE200_aoclfnxz)
  WALL_THERMOSTAT: {
    1: { capability: 'onoff', converter: 'boolean', type: 'BOOL', name: 'switch' },
    2: { capability: 'target_temperature', converter: 'divideBy10', type: 'VALUE', name: 'target_temp' },
    3: { capability: 'measure_temperature', converter: 'divideBy10', type: 'VALUE', name: 'current_temp' },
    4: { capability: null, converter: 'enum', type: 'ENUM', name: 'mode', values: { 0: 'manual', 1: 'auto', 2: 'away' } },
    6: { capability: null, converter: 'boolean', type: 'BOOL', name: 'child_lock' },
    101: { capability: null, converter: 'divideBy10', type: 'VALUE', name: 'floor_temp' },
    102: { capability: null, converter: 'enum', type: 'ENUM', name: 'sensor_type', values: { 0: 'internal', 1: 'external', 2: 'both' } },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// CURTAIN/COVER MOTORS
// Source: Z2M cover_switch
// ═══════════════════════════════════════════════════════════════════════════

const COVER_DPS = {
  // Standard curtain motor (_TZE200_cowvfni3)
  STANDARD: {
    1: { capability: 'windowcoverings_state', converter: 'enum', type: 'ENUM', name: 'control', values: { 0: 'open', 1: 'stop', 2: 'close' } },
    2: { capability: 'dim', converter: 'positionPercent', type: 'VALUE', name: 'position' },
    3: { capability: 'dim', converter: 'positionPercent', type: 'VALUE', name: 'position_alt' },
    5: { capability: null, converter: 'enum', type: 'ENUM', name: 'direction', values: { 0: 'forward', 1: 'reverse' } },
    7: { capability: null, converter: 'enum', type: 'ENUM', name: 'work_state', values: { 0: 'opening', 1: 'closing', 2: 'stop' } },
    101: { capability: 'windowcoverings_tilt_set', converter: 'positionPercent', type: 'VALUE', name: 'tilt' },
  },

  // Inverted position (_TZE200_nv6nxo0c)
  INVERTED: {
    1: { capability: 'windowcoverings_state', converter: 'enum', type: 'ENUM', name: 'control', values: { 0: 'open', 1: 'stop', 2: 'close' } },
    2: { capability: 'dim', converter: 'positionInvert', type: 'VALUE', name: 'position' },
    7: { capability: null, converter: 'enum', type: 'ENUM', name: 'work_state', values: { 0: 'opening', 1: 'closing', 2: 'stop' } },
  },

  // AM43 style motor
  AM43: {
    1: { capability: 'windowcoverings_state', converter: 'enum', type: 'ENUM', name: 'control', values: { 0: 'open', 1: 'stop', 2: 'close' } },
    2: { capability: 'dim', converter: 'positionPercent', type: 'VALUE', name: 'position' },
    3: { capability: 'measure_battery', converter: 'raw', type: 'VALUE', name: 'battery' },
    5: { capability: null, converter: 'enum', type: 'ENUM', name: 'direction' },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SWITCHES & DIMMERS
// Source: Z2M switch, dimmer
// ═══════════════════════════════════════════════════════════════════════════

const SWITCH_DPS = {
  // Multi-gang switches
  MULTIGANG: {
    1: { capability: 'onoff', converter: 'boolean', type: 'BOOL', name: 'switch_1' },
    2: { capability: 'onoff.1', converter: 'boolean', type: 'BOOL', name: 'switch_2' },
    3: { capability: 'onoff.2', converter: 'boolean', type: 'BOOL', name: 'switch_3' },
    4: { capability: 'onoff.3', converter: 'boolean', type: 'BOOL', name: 'switch_4' },
    5: { capability: 'onoff.4', converter: 'boolean', type: 'BOOL', name: 'switch_5' },
    6: { capability: 'onoff.5', converter: 'boolean', type: 'BOOL', name: 'switch_6' },
    7: { capability: null, converter: 'raw', type: 'VALUE', name: 'countdown_1' },
    8: { capability: null, converter: 'raw', type: 'VALUE', name: 'countdown_2' },
    9: { capability: null, converter: 'raw', type: 'VALUE', name: 'countdown_3' },
    10: { capability: null, converter: 'raw', type: 'VALUE', name: 'countdown_4' },
  },

  // Dimmer switches
  DIMMER: {
    1: { capability: 'onoff', converter: 'boolean', type: 'BOOL', name: 'switch' },
    2: { capability: 'dim', converter: 'divideBy1000', type: 'VALUE', name: 'brightness', min: 0, max: 1000 },
    3: { capability: null, converter: 'raw', type: 'VALUE', name: 'min_brightness' },
    4: { capability: null, converter: 'enum', type: 'ENUM', name: 'led_mode', values: { 0: 'off', 1: 'on', 2: 'relay' } },
    5: { capability: null, converter: 'raw', type: 'VALUE', name: 'power_on_state' },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SMART PLUGS WITH ENERGY MONITORING
// Source: Z2M TS011F, TS0121
// ═══════════════════════════════════════════════════════════════════════════

const PLUG_DPS = {
  // Energy monitoring plugs
  ENERGY: {
    1: { capability: 'onoff', converter: 'boolean', type: 'BOOL', name: 'switch' },
    9: { capability: null, converter: 'raw', type: 'VALUE', name: 'countdown' },
    17: { capability: null, converter: 'raw', type: 'VALUE', name: 'add_energy' },
    18: { capability: 'measure_current', converter: 'currentAmps', type: 'VALUE', name: 'current' },
    19: { capability: 'measure_power', converter: 'powerWatts', type: 'VALUE', name: 'power' },
    20: { capability: 'measure_voltage', converter: 'voltageVolts', type: 'VALUE', name: 'voltage' },
    21: { capability: null, converter: 'raw', type: 'VALUE', name: 'test_bit' },
    22: { capability: null, converter: 'raw', type: 'VALUE', name: 'voltage_coe' },
    23: { capability: null, converter: 'raw', type: 'VALUE', name: 'current_coe' },
    24: { capability: null, converter: 'raw', type: 'VALUE', name: 'power_coe' },
    25: { capability: null, converter: 'raw', type: 'VALUE', name: 'electricity_coe' },
    26: { capability: 'meter_power', converter: 'energyKwh100', type: 'VALUE', name: 'energy' },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SMOKE/GAS/CO DETECTORS
// Source: Z2M smoke, gas
// ═══════════════════════════════════════════════════════════════════════════

const SAFETY_SENSOR_DPS = {
  // Smoke detector
  SMOKE: {
    1: { capability: 'alarm_smoke', converter: 'enum', type: 'ENUM', name: 'smoke', values: { 0: false, 1: true } },
    2: { capability: null, converter: 'raw', type: 'VALUE', name: 'smoke_concentration' },
    14: { capability: 'measure_battery', converter: 'raw', type: 'VALUE', name: 'battery' },
    15: { capability: null, converter: 'boolean', type: 'BOOL', name: 'tamper' },
    16: { capability: null, converter: 'boolean', type: 'BOOL', name: 'fault' },
    101: { capability: null, converter: 'boolean', type: 'BOOL', name: 'silence' },
  },

  // Gas detector
  GAS: {
    1: { capability: 'alarm_gas', converter: 'enum', type: 'ENUM', name: 'gas', values: { 0: false, 1: true } },
    2: { capability: null, converter: 'raw', type: 'VALUE', name: 'gas_concentration' },
    6: { capability: null, converter: 'boolean', type: 'BOOL', name: 'fault' },
    8: { capability: null, converter: 'raw', type: 'VALUE', name: 'sensitivity' },
    9: { capability: null, converter: 'boolean', type: 'BOOL', name: 'self_test' },
  },

  // CO detector
  CO: {
    1: { capability: 'alarm_co', converter: 'enum', type: 'ENUM', name: 'co', values: { 0: false, 1: true } },
    2: { capability: 'measure_co', converter: 'raw', type: 'VALUE', name: 'co_concentration' },
    14: { capability: 'measure_battery', converter: 'raw', type: 'VALUE', name: 'battery' },
    15: { capability: null, converter: 'boolean', type: 'BOOL', name: 'tamper' },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// WATER LEAK SENSORS
// ═══════════════════════════════════════════════════════════════════════════

const WATER_SENSOR_DPS = {
  STANDARD: {
    1: { capability: 'alarm_water', converter: 'enum', type: 'ENUM', name: 'water_leak', values: { 0: false, 1: true } },
    4: { capability: 'measure_battery', converter: 'raw', type: 'VALUE', name: 'battery' },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// AIR QUALITY SENSORS
// Source: Z2M air quality
// ═══════════════════════════════════════════════════════════════════════════

const AIR_QUALITY_DPS = {
  STANDARD: {
    2: { capability: 'measure_co2', converter: 'raw', type: 'VALUE', name: 'co2' },
    18: { capability: 'measure_temperature', converter: 'divideBy10', type: 'VALUE', name: 'temperature' },
    19: { capability: 'measure_humidity', converter: 'raw', type: 'VALUE', name: 'humidity' },
    20: { capability: 'measure_formaldehyde', converter: 'divideBy100', type: 'VALUE', name: 'formaldehyde' },
    21: { capability: 'measure_voc', converter: 'raw', type: 'VALUE', name: 'voc' },
    22: { capability: 'measure_pm25', converter: 'raw', type: 'VALUE', name: 'pm25' },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SIRENS
// v5.5.821: Source: JohanBendz PR #1333, Z2M siren converters
// ═══════════════════════════════════════════════════════════════════════════

const SIREN_DPS = {
  STANDARD: {
    1: { capability: 'onoff', converter: 'boolean', type: 'BOOL', name: 'alarm' },
    5: { capability: null, converter: 'enum', type: 'ENUM', name: 'alarm_type', values: { 0: 'burglar', 1: 'fire', 2: 'sos', 3: 'door', 4: 'water', 5: 'motion' } },
    6: { capability: null, converter: 'enum', type: 'ENUM', name: 'alarm_volume', values: { 0: 'low', 1: 'medium', 2: 'high', 3: 'mute' } },
    7: { capability: null, converter: 'raw', type: 'VALUE', name: 'alarm_duration', min: 0, max: 1800 },
    13: { capability: 'measure_battery', converter: 'raw', type: 'VALUE', name: 'battery' },
    14: { capability: 'alarm_battery', converter: 'boolean', type: 'BOOL', name: 'battery_low' },
    15: { capability: 'alarm_tamper', converter: 'boolean', type: 'BOOL', name: 'tamper' },
    101: { capability: null, converter: 'enum', type: 'ENUM', name: 'charge_state', values: { 0: 'not_charging', 1: 'charging' } },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// MANUFACTURER → DP MAPPING RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════

const MANUFACTURER_DP_PROFILES = {
  // Climate sensors
  '_TZE284_vvmbj46n': { profile: CLIMATE_SENSOR_DPS.TZE284, type: 'climate' },
  '_TZE200_vvmbj46n': { profile: CLIMATE_SENSOR_DPS.STANDARD, type: 'climate' },
  '_TZE200_yjjdcqsq': { profile: CLIMATE_SENSOR_DPS.LCD_ROUND, type: 'climate' },
  '_TZE204_yjjdcqsq': { profile: CLIMATE_SENSOR_DPS.LCD_ROUND, type: 'climate' },
  '_TZE284_yjjdcqsq': { profile: CLIMATE_SENSOR_DPS.LCD_ROUND, type: 'climate' },
  '_TZE200_bjawzodf': { profile: CLIMATE_SENSOR_DPS.STANDARD, type: 'climate' },
  '_TZE284_5m4nchbm': { profile: CLIMATE_SENSOR_DPS.TZE284, type: 'climate', powerSource: 'mains' }, // Router!
  '_TZE200_utkemkbs': { profile: CLIMATE_SENSOR_DPS.STANDARD, type: 'climate' },
  '_TZE204_utkemkbs': { profile: CLIMATE_SENSOR_DPS.STANDARD, type: 'climate' },

  // Soil sensors
  '_TZE284_myd45weu': { profile: SOIL_SENSOR_DPS.STANDARD, type: 'soil' },
  '_TZE284_aao3yzhs': { profile: SOIL_SENSOR_DPS.STANDARD, type: 'soil' },
  '_TZE200_myd45weu': { profile: SOIL_SENSOR_DPS.STANDARD, type: 'soil' },

  // Presence/radar sensors
  '_TZE200_ar0slwnd': { profile: PRESENCE_SENSOR_DPS.ZY_M100, type: 'radar' },
  '_TZE200_rhgsbacq': { profile: PRESENCE_SENSOR_DPS.ZG_204ZM, type: 'radar_multi' },
  '_TZE204_sxm7l9xa': { profile: PRESENCE_SENSOR_DPS.MMWAVE, type: 'radar' },
  '_TZE200_ztc6ggyl': { profile: PRESENCE_SENSOR_DPS.FP_STYLE, type: 'radar' },
  '_TZE204_ztc6ggyl': { profile: PRESENCE_SENSOR_DPS.FP_STYLE, type: 'radar' },
  '_TZE200_ya4ft0w4': { profile: PRESENCE_SENSOR_DPS.ZY_M100, type: 'radar' },
  // v5.5.518: LeapMMW 5.8G radar - IAS Zone + Tuya DP hybrid (Z2M #23853, #23913)
  '_TZ321C_fkzihax8': { profile: PRESENCE_SENSOR_DPS.LEAPMW_5G8, type: 'radar_ias_hybrid' },
  '_TZ321C_4slreunp': { profile: PRESENCE_SENSOR_DPS.LEAPMW_5G8, type: 'radar_ias_hybrid' },

  // Thermostats
  '_TZE200_ckud7u2l': { profile: THERMOSTAT_DPS.TRV_STANDARD, type: 'trv' },
  '_TZE200_aoclfnxz': { profile: THERMOSTAT_DPS.WALL_THERMOSTAT, type: 'thermostat' },

  // Covers
  '_TZE200_cowvfni3': { profile: COVER_DPS.STANDARD, type: 'cover' },
  '_TZE200_nv6nxo0c': { profile: COVER_DPS.INVERTED, type: 'cover' },
  '_TZE200_fzo2pocs': { profile: COVER_DPS.STANDARD, type: 'cover' },

  // Plugs
  '_TZE200_plug_energy': { profile: PLUG_DPS.ENERGY, type: 'plug' },

  // Safety
  '_TZE200_smoke': { profile: SAFETY_SENSOR_DPS.SMOKE, type: 'smoke' },
  '_TZE200_gas': { profile: SAFETY_SENSOR_DPS.GAS, type: 'gas' },

  // v5.5.821: New devices from JohanBendz PRs
  // PR #1306: HOBEIAN 10G Multi-sensor radar
  '_TZE200_rhgsbacq': { profile: PRESENCE_SENSOR_DPS.HOBEIAN_10G, type: 'radar_multi' },
  
  // PR #1333: Siren _TZE200_t1blo2bj
  '_TZE200_t1blo2bj': { profile: SIREN_DPS.STANDARD, type: 'siren' },
  '_TZE204_t1blo2bj': { profile: SIREN_DPS.STANDARD, type: 'siren' },
  
  // v5.5.953: HOBEIAN ZG-204ZL/ZG-204ZV Multi-sensor (PIR + Temp/Humidity)
  // Peter_van_Werkhoven #1265: Device has temp/humidity - humidity uses RAW values
  '_TZE200_3towulqd': { profile: PRESENCE_SENSOR_DPS.ZG_204ZL, type: 'pir_multi' },
  '_tze200_3towulqd': { profile: PRESENCE_SENSOR_DPS.ZG_204ZL, type: 'pir_multi' },
  '_TZE204_3towulqd': { profile: PRESENCE_SENSOR_DPS.ZG_204ZL, type: 'pir_multi' },
  '_TZE200_1ibpyhdc': { profile: PRESENCE_SENSOR_DPS.ZG_204ZL, type: 'pir_multi' },
  '_TZE200_bh3n6gk8': { profile: PRESENCE_SENSOR_DPS.ZG_204ZL, type: 'pir_multi' },
  
  // PR #1332: HOBEIAN ZG-227Z Temperature/Humidity sensor
  'HOBEIAN': { profile: CLIMATE_SENSOR_DPS.STANDARD, type: 'climate' },
  
  // Rain sensor _TZ3210_tgvtvdoc / TS0207 (PR #983)
  '_TZ3210_tgvtvdoc': { profile: null, type: 'rain_sensor', notes: 'Uses IAS Zone cluster' },
  
  // AVATTO 1 gang dimmer _TZE204_5cuocqty (PR #981)
  '_TZE204_5cuocqty': { profile: SWITCH_DPS.DIMMER, type: 'dimmer' },
  '_TZE200_5cuocqty': { profile: SWITCH_DPS.DIMMER, type: 'dimmer' },
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CLASS
// ═══════════════════════════════════════════════════════════════════════════

class EnrichedDPMappings {

  /**
   * Get DP profile for manufacturer
   */
  static getProfile(manufacturerName) {
    return MANUFACTURER_DP_PROFILES[manufacturerName] || null;
  }

  /**
   * Get converter function
   */
  static getConverter(converterName) {
    return CONVERTERS[converterName] || CONVERTERS.raw;
  }

  /**
   * Parse DP value using profile
   */
  static parseDP(manufacturerName, dp, rawValue) {
    const profile = this.getProfile(manufacturerName);
    if (!profile?.profile?.[dp]) return { value: rawValue, capability: null };

    const dpConfig = profile.profile[dp];
    const converter = this.getConverter(dpConfig.converter);
    const value = converter(rawValue, dpConfig.values);

    return {
      value,
      capability: dpConfig.capability,
      name: dpConfig.name,
      type: dpConfig.type,
    };
  }

  /**
   * Get all DPs for manufacturer
   */
  static getDPsForManufacturer(manufacturerName) {
    const profile = this.getProfile(manufacturerName);
    return profile?.profile || null;
  }

  /**
   * Get device type for manufacturer
   */
  static getDeviceType(manufacturerName) {
    const profile = this.getProfile(manufacturerName);
    return profile?.type || 'unknown';
  }
}

// Export everything
module.exports = EnrichedDPMappings;
module.exports.CONVERTERS = CONVERTERS;
module.exports.CLIMATE_SENSOR_DPS = CLIMATE_SENSOR_DPS;
module.exports.SOIL_SENSOR_DPS = SOIL_SENSOR_DPS;
module.exports.PRESENCE_SENSOR_DPS = PRESENCE_SENSOR_DPS;
module.exports.THERMOSTAT_DPS = THERMOSTAT_DPS;
module.exports.COVER_DPS = COVER_DPS;
module.exports.SWITCH_DPS = SWITCH_DPS;
module.exports.PLUG_DPS = PLUG_DPS;
module.exports.SAFETY_SENSOR_DPS = SAFETY_SENSOR_DPS;
module.exports.WATER_SENSOR_DPS = WATER_SENSOR_DPS;
module.exports.AIR_QUALITY_DPS = AIR_QUALITY_DPS;
module.exports.SIREN_DPS = SIREN_DPS;
module.exports.MANUFACTURER_DP_PROFILES = MANUFACTURER_DP_PROFILES;
