'use strict';

/**
 * TuyaDataPointUtils
 * v5.5.740: Utility module for Tuya DataPoint handling
 * Source: Inspired by PR #740 (maccyber) utils.js pattern
 * 
 * This module provides a centralized location for:
 * - DataPoint ID constants
 * - DataType constants
 * - Value parsing helpers
 */

// ═══════════════════════════════════════════════════════════════════════════
// TUYA DATA TYPES (from Tuya MCU Protocol)
// ═══════════════════════════════════════════════════════════════════════════
const TUYA_DATA_TYPES = {
  RAW: 0,      // Raw bytes
  BOOL: 1,     // Boolean (1 byte)
  VALUE: 2,    // 32-bit signed integer
  STRING: 3,   // UTF-8 string
  ENUM: 4,     // Enum (1 byte)
  BITMAP: 5,   // Bitmap (1-4 bytes)
};

// ═══════════════════════════════════════════════════════════════════════════
// COMMON DATAPOINT IDS (from various device types)
// ═══════════════════════════════════════════════════════════════════════════
const COMMON_DATAPOINTS = {
  // Switches / Plugs (Multi-gang standard)
  SWITCH_1: 1,
  SWITCH_2: 2,
  SWITCH_3: 3,
  SWITCH_4: 4,
  COUNTDOWN_1: 7,
  COUNTDOWN_2: 8,
  COUNTDOWN_3: 9,
  COUNTDOWN_4: 10,
  
  // Power monitoring
  POWER_CURRENT: 18,
  POWER_WATT: 19,
  POWER_VOLTAGE: 20,
  
  // PIR / Motion sensors (from PR #740)
  PIR_STATE: 1,
  PIR_SENSITIVITY: 9,
  PIR_TIME: 10,
  ILLUMINANCE_VALUE: 12,
  BATTERY_PERCENTAGE: 4,
  INTERVAL_TIME: 102,
  
  // Temperature / Humidity
  TEMPERATURE: 1,
  HUMIDITY: 2,
  TEMP_UNIT: 9,
  BATTERY_LOW: 14,
  
  // Siren
  ALARM_ONOFF: 13,
  ALARM_VOLUME: 5,
  ALARM_DURATION: 7,
  ALARM_MELODY: 21,
  
  // Thermostat / TRV
  TRV_ONOFF: 101,
  TRV_TARGET_TEMP: 103,
  TRV_CURRENT_TEMP: 102,
  TRV_MODE: 104,
  
  // Cover / Curtain
  COVER_POSITION: 2,
  COVER_ARRIVED: 3,
  COVER_MOTOR_DIRECTION: 5,
  
  // Time sync
  TIME_SYNC: 103,
};

// ═══════════════════════════════════════════════════════════════════════════
// VALUE PARSING HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse a Tuya DP value based on its datatype
 * @param {Object} dpValue - The DP value object with datatype and data
 * @returns {*} The parsed value
 */
function getDataValue(dpValue) {
  if (!dpValue || dpValue.data === undefined) {
    return null;
  }

  const data = dpValue.data;

  switch (dpValue.datatype) {
    case TUYA_DATA_TYPES.BOOL:
      return Boolean(data[0]);
      
    case TUYA_DATA_TYPES.VALUE:
      // 4-byte signed integer (big-endian)
      if (Buffer.isBuffer(data)) {
        return data.readInt32BE(0);
      }
      return parseInt(data.toString('hex'), 16);
      
    case TUYA_DATA_TYPES.ENUM:
      return data[0];
      
    case TUYA_DATA_TYPES.STRING:
      return data.toString('utf8');
      
    case TUYA_DATA_TYPES.BITMAP:
      if (Buffer.isBuffer(data)) {
        if (data.length === 1) return data[0];
        if (data.length === 2) return data.readUInt16BE(0);
        if (data.length === 4) return data.readUInt32BE(0);
      }
      return data;
      
    case TUYA_DATA_TYPES.RAW:
    default:
      return data;
  }
}

/**
 * Convert a value to Tuya DP format
 * @param {*} value - The value to convert
 * @param {number} datatype - The target datatype
 * @returns {Buffer} The encoded buffer
 */
function encodeDataValue(value, datatype) {
  switch (datatype) {
    case TUYA_DATA_TYPES.BOOL: {
      const buf = Buffer.alloc(1);
      buf.writeUInt8(value ? 1 : 0, 0);
      return buf;
    }
    
    case TUYA_DATA_TYPES.VALUE: {
      const buf = Buffer.alloc(4);
      buf.writeInt32BE(value, 0);
      return buf;
    }
    
    case TUYA_DATA_TYPES.ENUM: {
      const buf = Buffer.alloc(1);
      buf.writeUInt8(value & 0xFF, 0);
      return buf;
    }
    
    case TUYA_DATA_TYPES.STRING:
      return Buffer.from(String(value), 'utf8');
      
    case TUYA_DATA_TYPES.BITMAP: {
      if (Buffer.isBuffer(value)) return value;
      const buf = Buffer.alloc(4);
      buf.writeUInt32BE(value, 0);
      return buf;
    }
    
    case TUYA_DATA_TYPES.RAW:
    default:
      if (Buffer.isBuffer(value)) return value;
      return Buffer.from([value]);
  }
}

/**
 * Scale a temperature value (divide by 10 or 100)
 * @param {number} value - Raw temperature value
 * @param {number} divisor - Divisor (10 or 100)
 * @returns {number} Scaled temperature
 */
function scaleTemperature(value, divisor = 10) {
  return value / divisor;
}

/**
 * Scale a humidity value
 * @param {number} value - Raw humidity value
 * @param {number} divisor - Divisor (typically 10)
 * @returns {number} Scaled humidity (0-100)
 */
function scaleHumidity(value, divisor = 10) {
  return Math.min(100, Math.max(0, value / divisor));
}

/**
 * Convert battery percentage (some devices report 0-100, others 0-200)
 * @param {number} value - Raw battery value
 * @param {boolean} isDoubled - Whether value is doubled (0-200)
 * @returns {number} Battery percentage (0-100)
 */
function scaleBattery(value, isDoubled = true) {
  const pct = isDoubled ? value / 2 : value;
  return Math.min(100, Math.max(0, pct));
}

/**
 * Parse illuminance value based on device type
 * @param {number} value - Raw illuminance value
 * @param {string} type - 'lux_direct' | 'lux_log' | 'percent'
 * @returns {number} Illuminance in lux
 */
function parseIlluminance(value, type = 'lux_direct') {
  switch (type) {
    case 'lux_direct':
      return value;
    case 'lux_log':
      // Some devices use logarithmic scale
      return Math.pow(10, (value - 1) / 10000);
    case 'percent':
      // Convert percentage to approximate lux
      return Math.round(value * 10);
    default:
      return value;
  }
}

module.exports = {
  TUYA_DATA_TYPES,
  COMMON_DATAPOINTS,
  getDataValue,
  encodeDataValue,
  scaleTemperature,
  scaleHumidity,
  scaleBattery,
  parseIlluminance,
};
