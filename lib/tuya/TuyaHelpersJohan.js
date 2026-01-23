'use strict';

/**
 * TuyaHelpersJohan.js - Helper Functions from Johan Bendz
 * 
 * Source: https://github.com/JohanBendz/com.tuya.zigbee/blob/master/lib/TuyaHelpers.js
 * 
 * Provides utility functions for:
 * - Parsing Tuya DP values (getDataValue)
 * - Schedule parsing and marshaling
 * - Brightness/Light source configuration
 * - Power-on state management
 * 
 * v5.5.760: Enrichment from Johan Bendz's implementation
 */

const { TUYA_DATA_TYPES, SCHEDULE_DAY_BITMAP } = require('./TuyaDataPointsJohan');

// ============================================================================
// DATA VALUE PARSING
// ============================================================================

/**
 * Convert multi-byte number payload to single decimal number
 * Handles 1, 2, or 4 byte big-endian values
 * 
 * @param {Buffer|Array} data - The byte array/buffer to convert
 * @returns {number} - The decimal number
 */
function convertMultiByteNumberPayloadToSingleDecimalNumber(data) {
  if (!data || data.length === 0) return 0;
  
  let value = 0;
  for (let i = 0; i < data.length; i++) {
    value = (value << 8) + (data[i] & 0xFF);
  }
  return value;
}

/**
 * Get the processed value from a Tuya DP response
 * Handles all Tuya data types: raw, bool, value, string, enum, bitmap
 * 
 * @param {Object} dpValue - The DP value object with datatype and data
 * @param {number} dpValue.datatype - The Tuya data type (0-5)
 * @param {Buffer|Array} dpValue.data - The raw data bytes
 * @returns {number|string|boolean|Buffer} - The processed value
 */
function getDataValue(dpValue) {
  if (!dpValue || dpValue.data === undefined) {
    return null;
  }

  switch (dpValue.datatype) {
    case TUYA_DATA_TYPES.raw:
      return dpValue.data;
      
    case TUYA_DATA_TYPES.bool:
      return dpValue.data[0] === 1;
      
    case TUYA_DATA_TYPES.value:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
      
    case TUYA_DATA_TYPES.string:
      return String.fromCharCode(...dpValue.data);
      
    case TUYA_DATA_TYPES.enum:
      return dpValue.data[0];
      
    case TUYA_DATA_TYPES.bitmap:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
      
    default:
      console.warn(`[TuyaHelpers] Unsupported datatype: ${dpValue.datatype}`);
      return dpValue.data;
  }
}

/**
 * Get DP value with type coercion
 * Useful when you know what type to expect
 * 
 * @param {Object} dpValue - The DP value object
 * @param {string} expectedType - 'bool', 'number', 'string'
 * @returns {*} - Coerced value
 */
function getTypedDataValue(dpValue, expectedType) {
  const value = getDataValue(dpValue);
  
  switch (expectedType) {
    case 'bool':
      return Boolean(value);
    case 'number':
      return Number(value) || 0;
    case 'string':
      return String(value);
    default:
      return value;
  }
}

// ============================================================================
// SCHEDULE PARSING
// ============================================================================

/**
 * Parse a Tuya schedule byte array into human-readable format
 * Used by thermostats and similar devices
 * 
 * Schedule format: Each period is 3 bytes [time, temp_high, temp_low]
 * - time: Minutes from midnight / 10 (e.g., 48 = 08:00)
 * - temp: High byte << 8 | Low byte, then / 10 for °C
 * 
 * @param {Buffer|Array} bytes - The schedule byte array
 * @returns {string} - Formatted schedule (e.g., '08:00/22.5 12:00/18.0 24:00/16.0')
 */
function parseSchedule(bytes) {
  if (!bytes || bytes.length < 3) return '';
  
  const maxPeriodsInDay = 10;
  const periodSize = 3;
  const schedule = [];

  for (let i = 0; i < maxPeriodsInDay; i++) {
    const offset = i * periodSize;
    if (offset + 2 >= bytes.length) break;
    
    const time = bytes[offset];
    const totalMinutes = time * 10;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const temperature = ((bytes[offset + 1] << 8) | bytes[offset + 2]) / 10;

    // Format: HH:MM/temperature
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    schedule.push(`${timeStr}/${temperature}`);

    // Stop if this period covers 24 hours (end of day)
    if (hours === 24) break;
  }

  return schedule.join(' ');
}

/**
 * Marshal a human-readable schedule into Tuya byte array
 * 
 * @param {string} workingDay - Working day mode: '0' (Mon-Sun), '1' (Mon-Fri/Sat-Sun), '2' (Separate)
 * @param {number} weekDayDataPoint - The DP for this day (from SCHEDULE_DAY_BITMAP)
 * @param {string} scheduleString - The schedule (e.g., '08:00/22.5 12:00/18.0 24:00/16.0')
 * @returns {Buffer} - The marshaled schedule bytes
 */
function marshalSchedule(workingDay, weekDayDataPoint, scheduleString) {
  const payload = [];
  const schedule = scheduleString.split(' ');

  if (schedule.length < 2 || schedule.length > 10) {
    throw new Error('Invalid schedule: must have between 2 and 10 periods.');
  }

  // Add day bitmap based on working day mode
  switch (workingDay) {
    case '0': // Mon-Sun (all days same)
      payload.push(127); // 0b01111111 = all days
      break;
    case '1': // Mon-Fri / Sat-Sun
      payload.push([114, 111].indexOf(weekDayDataPoint) === -1 
        ? 31  // 0b00011111 = Mon-Fri
        : SCHEDULE_DAY_BITMAP[weekDayDataPoint]);
      break;
    case '2': // Separate (each day individual)
      payload.push(SCHEDULE_DAY_BITMAP[weekDayDataPoint] || 1);
      break;
    default:
      throw new Error('Invalid workingDay setting: must be 0, 1, or 2.');
  }

  // Parse and add each schedule period
  let prevHour = 0;
  
  for (const period of schedule) {
    const [time, temperature] = period.split('/');
    const [hours, minutes] = time.split(':').map(Number);
    const temp = parseFloat(temperature);

    // Validate
    if (hours < 0 || hours > 24 || minutes % 10 !== 0 || temp < 5 || temp > 30 || temp % 0.5 !== 0) {
      throw new Error(`Invalid period entry: ${period}`);
    }
    if (prevHour > hours) {
      throw new Error('Invalid time sequence: hours must be ascending.');
    }
    prevHour = hours;

    // Convert to bytes
    const segment = (hours * 60 + minutes) / 10;
    const tempValue = Math.round(temp * 10);
    payload.push(segment, (tempValue >> 8) & 0xFF, tempValue & 0xFF);
  }

  // Pad remaining periods with default (24:00/18.0)
  for (let i = 0; i < 10 - schedule.length; i++) {
    payload.push(144, 0, 180); // 24:00, 18.0°C
  }

  return Buffer.from(payload);
}

/**
 * Convert decimal value to 2-byte hex array (big-endian)
 * 
 * @param {number} value - The decimal value
 * @returns {Array<number>} - [highByte, lowByte]
 */
function convertDecimalValueTo2ByteHexArray(value) {
  const intValue = Math.round(value);
  return [(intValue >> 8) & 0xFF, intValue & 0xFF];
}

/**
 * Convert decimal value to 4-byte hex array (big-endian)
 * 
 * @param {number} value - The decimal value
 * @returns {Array<number>} - [byte3, byte2, byte1, byte0]
 */
function convertDecimalValueTo4ByteHexArray(value) {
  const intValue = Math.round(value);
  return [
    (intValue >> 24) & 0xFF,
    (intValue >> 16) & 0xFF,
    (intValue >> 8) & 0xFF,
    intValue & 0xFF
  ];
}

// ============================================================================
// DIMMER/LIGHT HELPERS
// ============================================================================

/**
 * Set minimum brightness level for a dimmer gang
 * 
 * @param {Object} device - The device instance (must have writeData32 method)
 * @param {number} value - Brightness level (0-1000)
 * @param {string} gang - Which gang: 'One' or 'Two'
 */
async function setMinimumBrightness(device, value, gang = 'One') {
  const dp = gang === 'One' ? 3 : 9;
  await device.writeData32(dp, value);
}

/**
 * Set maximum brightness level for a dimmer gang
 * 
 * @param {Object} device - The device instance
 * @param {number} value - Brightness level (0-1000)
 * @param {string} gang - Which gang: 'One' or 'Two'
 */
async function setMaximumBrightness(device, value, gang = 'One') {
  const dp = gang === 'One' ? 5 : 11;
  await device.writeData32(dp, value);
}

/**
 * Set the type of light source for a dimmer
 * 
 * @param {Object} device - The device instance
 * @param {number} value - Enum: 0=LED, 1=incandescent, 2=halogen
 * @param {string} gang - Which gang: 'One' or 'Two'
 */
async function setTypeOfLightSource(device, value, gang = 'One') {
  const dp = gang === 'One' ? 4 : 10;
  await device.writeEnum(dp, value);
}

/**
 * Set power-on status behavior
 * 
 * @param {Object} device - The device instance
 * @param {number} value - Enum: 0=off, 1=on, 2=memory
 */
async function setPowerOnStatus(device, value) {
  await device.writeEnum(14, value);
}

/**
 * Set switch type
 * 
 * @param {Object} device - The device instance
 * @param {number} value - Enum: 0=toggle, 1=state, 2=momentary
 */
async function setSwitchType(device, value) {
  await device.writeEnum(17, value);
}

// ============================================================================
// TEMPERATURE HELPERS
// ============================================================================

/**
 * Convert raw temperature DP value to Celsius
 * Handles both *10 and *100 formats
 * 
 * @param {number} rawValue - Raw DP value
 * @param {number} divisor - Divisor (10 or 100, default 10)
 * @returns {number} - Temperature in Celsius
 */
function rawToTemperature(rawValue, divisor = 10) {
  return rawValue / divisor;
}

/**
 * Convert Celsius to raw temperature DP value
 * 
 * @param {number} celsius - Temperature in Celsius
 * @param {number} multiplier - Multiplier (10 or 100, default 10)
 * @returns {number} - Raw DP value
 */
function temperatureToRaw(celsius, multiplier = 10) {
  return Math.round(celsius * multiplier);
}

/**
 * Validate and clamp temperature to valid range
 * 
 * @param {number} temp - Temperature to validate
 * @param {number} min - Minimum allowed (default 5)
 * @param {number} max - Maximum allowed (default 35)
 * @returns {number} - Clamped temperature
 */
function clampTemperature(temp, min = 5, max = 35) {
  return Math.max(min, Math.min(max, temp));
}

// ============================================================================
// PERCENTAGE HELPERS
// ============================================================================

/**
 * Convert Tuya 0-1000 brightness to Homey 0-1
 * 
 * @param {number} tuya - Tuya brightness (0-1000)
 * @returns {number} - Homey brightness (0-1)
 */
function tuyaBrightnessToHomey(tuya) {
  return Math.max(0, Math.min(1, tuya / 1000));
}

/**
 * Convert Homey 0-1 brightness to Tuya 0-1000
 * 
 * @param {number} homey - Homey brightness (0-1)
 * @returns {number} - Tuya brightness (0-1000)
 */
function homeyBrightnessToTuya(homey) {
  return Math.round(Math.max(0, Math.min(1, homey)) * 1000);
}

/**
 * Convert Tuya position (may be inverted) to Homey 0-1
 * 
 * @param {number} tuya - Tuya position (0-100)
 * @param {boolean} inverted - If true, 0=open, 100=closed
 * @returns {number} - Homey position (0-1, 0=closed, 1=open)
 */
function tuyaPositionToHomey(tuya, inverted = false) {
  const position = inverted ? (100 - tuya) : tuya;
  return position / 100;
}

/**
 * Convert Homey 0-1 position to Tuya 0-100
 * 
 * @param {number} homey - Homey position (0-1)
 * @param {boolean} inverted - If true, output 0=open, 100=closed
 * @returns {number} - Tuya position (0-100)
 */
function homeyPositionToTuya(homey, inverted = false) {
  const position = Math.round(homey * 100);
  return inverted ? (100 - position) : position;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Data value parsing
  getDataValue,
  getTypedDataValue,
  convertMultiByteNumberPayloadToSingleDecimalNumber,
  
  // Schedule
  parseSchedule,
  marshalSchedule,
  
  // Byte conversion
  convertDecimalValueTo2ByteHexArray,
  convertDecimalValueTo4ByteHexArray,
  
  // Dimmer/Light settings
  setMinimumBrightness,
  setMaximumBrightness,
  setTypeOfLightSource,
  setPowerOnStatus,
  setSwitchType,
  
  // Temperature
  rawToTemperature,
  temperatureToRaw,
  clampTemperature,
  
  // Percentage/Position
  tuyaBrightnessToHomey,
  homeyBrightnessToTuya,
  tuyaPositionToHomey,
  homeyPositionToTuya
};
