'use strict';

/**
 * TuyaDataPointsZ2M.js - Zigbee2MQTT Tuya Enrichment
 * 
 * Source: https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/lib/tuya.ts
 * 
 * Comprehensive Tuya DP definitions, value converters, and helpers from Z2M.
 * This provides:
 * - Data type definitions
 * - Value converters (lookup, scale, divideBy, etc.)
 * - Expose definitions for capabilities
 * - Schedule parsing/marshaling
 * - Energy meter phase parsing
 * 
 * v5.5.760: Z2M enrichment for comprehensive Tuya support
 */

// ============================================================================
// TUYA DATA TYPES (Z2M Standard)
// ============================================================================

const DATA_TYPES = {
  raw: 0,      // [ bytes ] - Raw data buffer
  bool: 1,     // [ 0/1 ] - Boolean
  number: 2,   // [ 4 byte value ] - 32-bit integer (big-endian)
  string: 3,   // [ N byte string ] - Variable length string
  enum: 4,     // [ 0-255 ] - Enumeration
  bitmap: 5,   // [ 1,2,4 bytes ] - Bitmap/bitfield
};

// ============================================================================
// WEATHER CONDITIONS (M8 Pro Panel)
// ============================================================================

const WEATHER_CONDITIONS = {
  sunny: 100,
  heavy_rain: 101,
  cloudy: 102,
  sandstorm: 103,
  light_snow: 104,
  snow: 105,
  freezing_fog: 106,
  rainstorm: 107,
  shower: 108,
  dust: 109,
  spit: 112,
  sleet: 113,
  yin: 114,
  freezing_rain: 115,
  rain: 118,
  fog: 121,
  heavy_shower: 123,
  heavy_snow: 124,
  heavy_downpour: 125,
  blizzard: 126,
  hailstone: 127,
  snow_shower: 130,
  haze: 140,
  thunder_shower: 143,
};

const WEATHER_IDS = {
  Temperature: 0x01,
  Humidity: 0x02,
  Condition: 0x03,
};

// ============================================================================
// BACKLIGHT COLOR ENUM
// ============================================================================

const BACKLIGHT_COLORS = {
  red: 0,
  blue: 1,
  green: 2,
  white: 3,
  yellow: 4,
  magenta: 5,
  cyan: 6,
  warm_white: 7,
};

// ============================================================================
// VALUE CONVERTER UTILITIES
// ============================================================================

/**
 * Convert buffer to number (big-endian)
 * @param {Buffer|Array} chunks - Byte array
 * @returns {number}
 */
function convertBufferToNumber(chunks) {
  if (!chunks || chunks.length === 0) return 0;
  let value = 0;
  for (let i = 0; i < chunks.length; i++) {
    value = (value << 8) + (chunks[i] & 0xFF);
  }
  return value;
}

/**
 * Convert string to hex array (ASCII codes)
 * @param {string} value - String to convert
 * @returns {Array<number>}
 */
function convertStringToHexArray(value) {
  const asciiKeys = [];
  for (let i = 0; i < value.length; i++) {
    asciiKeys.push(value.charCodeAt(i));
  }
  return asciiKeys;
}

/**
 * Convert decimal to 4-byte hex array (big-endian)
 * @param {number} value - Decimal value
 * @returns {Array<number>}
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

/**
 * Convert decimal to 2-byte hex array (big-endian)
 * @param {number} value - Decimal value
 * @returns {Array<number>}
 */
function convertDecimalValueTo2ByteHexArray(value) {
  const intValue = Math.round(value);
  return [(intValue >> 8) & 0xFF, intValue & 0xFF];
}

/**
 * Get data value from DP response (Z2M style)
 * @param {Object} dpValue - DP value with datatype and data
 * @returns {*}
 */
function getDataValue(dpValue) {
  if (!dpValue || dpValue.data === undefined) return null;
  
  switch (dpValue.datatype) {
    case DATA_TYPES.raw:
      return dpValue.data;
    case DATA_TYPES.bool:
      return dpValue.data[0] === 1;
    case DATA_TYPES.number:
      return convertBufferToNumber(dpValue.data);
    case DATA_TYPES.string:
      let str = '';
      for (let i = 0; i < dpValue.data.length; i++) {
        str += String.fromCharCode(dpValue.data[i]);
      }
      return str;
    case DATA_TYPES.enum:
      return dpValue.data[0];
    case DATA_TYPES.bitmap:
      return convertBufferToNumber(dpValue.data);
    default:
      return dpValue.data;
  }
}

// ============================================================================
// VALUE CONVERTERS (Z2M Style)
// ============================================================================

/**
 * Basic value converter factory
 */
const valueConverterBasic = {
  /**
   * Lookup converter - maps between string keys and numeric values
   * @param {Object} map - Lookup map {key: value}
   * @param {*} fallbackValue - Value to return if lookup fails
   */
  lookup: (map, fallbackValue = null) => ({
    to: (v) => {
      const result = map[v];
      if (result === undefined && fallbackValue !== null) return fallbackValue;
      return result !== undefined ? (result.valueOf ? result.valueOf() : result) : v;
    },
    from: (v) => {
      const entry = Object.entries(map).find(([_, val]) => 
        (val.valueOf ? val.valueOf() : val) === v
      );
      if (!entry && fallbackValue !== null) return fallbackValue;
      return entry ? entry[0] : v;
    }
  }),

  /**
   * Scale converter - maps between two numeric ranges
   * @param {number} min1 - Source min
   * @param {number} max1 - Source max
   * @param {number} min2 - Target min
   * @param {number} max2 - Target max
   */
  scale: (min1, max1, min2, max2) => ({
    to: (v) => {
      const ratio = (v - min1) / (max1 - min1);
      return min2 + ratio * (max2 - min2);
    },
    from: (v) => {
      const ratio = (v - min2) / (max2 - min2);
      return min1 + ratio * (max1 - min1);
    }
  }),

  /**
   * Raw passthrough converter
   */
  raw: () => ({
    to: (v) => v,
    from: (v) => v
  }),

  /**
   * Divide by converter
   * @param {number} value - Divisor
   */
  divideBy: (value) => ({
    to: (v) => v * value,
    from: (v) => v / value
  }),

  /**
   * Divide by (from only) - only applies division on incoming values
   * @param {number} value - Divisor
   */
  divideByFromOnly: (value) => ({
    to: (v) => v,
    from: (v) => v / value
  }),

  /**
   * Divide by with limits
   * @param {number} value - Divisor
   * @param {number} min - Minimum output
   * @param {number} max - Maximum output
   */
  divideByWithLimits: (value, min, max) => ({
    to: (v) => {
      const result = v * value;
      return Math.max(min * value, Math.min(max * value, result));
    },
    from: (v) => {
      const result = v / value;
      return Math.max(min, Math.min(max, result));
    }
  }),

  /**
   * True/False converter for specific true value
   * @param {number} valueTrue - Value representing true
   */
  trueFalse: (valueTrue) => ({
    from: (v) => v === (valueTrue.valueOf ? valueTrue.valueOf() : valueTrue)
  })
};

/**
 * Pre-built value converters (Z2M standard)
 */
const valueConverter = {
  // Boolean converters
  trueFalse0: valueConverterBasic.trueFalse(0),
  trueFalse1: valueConverterBasic.trueFalse(1),
  trueFalseInvert: {
    to: (v) => !v,
    from: (v) => !v
  },

  // On/Off
  onOff: valueConverterBasic.lookup({ ON: true, OFF: false }),

  // Power on behavior
  powerOnBehavior: valueConverterBasic.lookup({ off: 0, on: 1, previous: 2 }),

  // Switch types
  switchType: valueConverterBasic.lookup({ momentary: 0, toggle: 1, state: 2 }),
  switchType2: valueConverterBasic.lookup({ toggle: 0, state: 1, momentary: 2 }),
  switchTypeCurtain: valueConverterBasic.lookup({
    'flip-switch': 0,
    'sync-switch': 1,
    'button-switch': 2,
    'button2-switch': 3
  }),

  // Backlight modes
  backlightModeOffNormalInverted: valueConverterBasic.lookup({ off: 0, normal: 1, inverted: 2 }),
  backlightModeOffLowMediumHigh: valueConverterBasic.lookup({ off: 0, low: 1, medium: 2, high: 3 }),

  // Light type
  lightType: valueConverterBasic.lookup({ led: 0, incandescent: 1, halogen: 2 }),

  // Light mode
  lightMode: valueConverterBasic.lookup({ normal: 0, on: 1, off: 2, flash: 3 }),

  // Switch mode
  switchMode: valueConverterBasic.lookup({ switch: 0, scene: 1 }),
  switchMode2: valueConverterBasic.lookup({ switch: 0, curtain: 1 }),

  // Temperature
  temperatureUnit: valueConverterBasic.lookup({ celsius: 0, fahrenheit: 1 }),
  
  // Battery
  batteryState: valueConverterBasic.lookup({ low: 0, medium: 1, high: 2 }),

  // Countdown (passthrough)
  countdown: valueConverterBasic.raw(),
  raw: valueConverterBasic.raw(),

  // Scale converters
  scale0_254to0_1000: valueConverterBasic.scale(0, 254, 0, 1000),
  scale0_1to0_1000: valueConverterBasic.scale(0, 1, 0, 1000),

  // Divide converters
  divideBy2: valueConverterBasic.divideBy(2),
  divideBy10: valueConverterBasic.divideBy(10),
  divideBy100: valueConverterBasic.divideBy(100),
  divideBy1000: valueConverterBasic.divideBy(1000),
  divideBy10FromOnly: valueConverterBasic.divideByFromOnly(10),

  // Local temperature calibration (handles negative values via 4096 offset)
  localTemperatureCalibration: {
    from: (value) => (value > 4000 ? value - 4096 : value),
    to: (value) => (value < 0 ? 4096 + value : value)
  },

  // Local temperature calibration (256 offset variant)
  localTemperatureCalibration_256: {
    from: (value) => (value > 200 ? value - 256 : value),
    to: (value) => (value < 0 ? 256 + value : value)
  },

  // Cover position
  coverPosition: {
    to: (v, options = {}) => options.invert_cover ? 100 - v : v,
    from: (v, options = {}) => options.invert_cover ? 100 - v : v
  },

  // Cover position inverted (default inverted)
  coverPositionInverted: {
    to: (v, options = {}) => options.invert_cover ? v : 100 - v,
    from: (v, options = {}) => options.invert_cover ? v : 100 - v
  },

  // Tubular motor direction
  tubularMotorDirection: valueConverterBasic.lookup({ normal: 0, reversed: 1 }),

  // Plus/minus 1
  plus1: {
    from: (v) => v + 1,
    to: (v) => v - 1
  },

  // Power (handles negative readings)
  power: {
    from: (v) => v > 0x0FFFFFFF ? (0x1999999C - v) * -1 : v
  },

  // Self test result
  selfTestResult: valueConverterBasic.lookup({ checking: 0, success: 1, failure: 2, others: 3 }),

  // Lock/Unlock
  lockUnlock: valueConverterBasic.lookup({ LOCK: true, UNLOCK: false })
};

// ============================================================================
// SCHEDULE CONVERTERS
// ============================================================================

/**
 * Parse thermostat schedule from bytes
 * Format: Each period is 3 bytes [time_segment, temp_high, temp_low]
 * @param {Buffer|Array} bytes - Schedule bytes
 * @param {number} maxPeriods - Maximum periods (default 10)
 * @returns {string} - Formatted schedule "HH:MM/temp HH:MM/temp ..."
 */
function parseSchedule(bytes, maxPeriods = 10) {
  if (!bytes || bytes.length < 3) return '';
  
  const schedule = [];
  const periodSize = 3;

  for (let i = 0; i < maxPeriods; i++) {
    const offset = i * periodSize;
    if (offset + 2 >= bytes.length) break;

    const time = bytes[offset];
    const totalMinutes = time * 10;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const temperature = ((bytes[offset + 1] << 8) | bytes[offset + 2]) / 10;

    schedule.push(
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}/${temperature}`
    );

    if (hours === 24) break;
  }

  return schedule.join(' ');
}

/**
 * Marshal thermostat schedule to bytes
 * @param {string} scheduleString - Schedule "HH:MM/temp HH:MM/temp ..."
 * @param {number} dayBitmap - Day bitmap (127 = all days)
 * @param {number} maxPeriods - Maximum periods (default 10)
 * @returns {Buffer}
 */
function marshalSchedule(scheduleString, dayBitmap = 127, maxPeriods = 10) {
  const payload = [dayBitmap];
  const schedule = scheduleString.split(' ');

  if (schedule.length < 2 || schedule.length > maxPeriods) {
    throw new Error(`Invalid schedule: must have between 2 and ${maxPeriods} periods`);
  }

  let prevHour = 0;

  for (const period of schedule) {
    const [time, temp] = period.split('/');
    const [hours, minutes] = time.split(':').map(Number);
    const temperature = parseFloat(temp);

    if (hours < 0 || hours > 24 || minutes < 0 || minutes >= 60 || 
        minutes % 10 !== 0 || temperature < 5 || temperature > 30 || 
        temperature % 0.5 !== 0) {
      throw new Error(`Invalid period: ${period}`);
    }

    if (prevHour > hours) {
      throw new Error('Hours must be ascending');
    }
    prevHour = hours;

    const segment = (hours * 60 + minutes) / 10;
    const tempHex = convertDecimalValueTo2ByteHexArray(temperature * 10);
    payload.push(segment, ...tempHex);
  }

  // Pad remaining periods with default (24:00/18.0)
  for (let i = 0; i < maxPeriods - schedule.length; i++) {
    payload.push(144, 0, 180);
  }

  return Buffer.from(payload);
}

/**
 * Parse multi-DP schedule format (used by some TRVs)
 * @param {Buffer|string} v - Schedule data
 * @param {number} transitionCount - Number of transitions (default 4)
 * @returns {string}
 */
function parseScheduleMultiDP(v, transitionCount = 4) {
  const schedule = [];
  for (let index = 1; index < transitionCount * 4 - 1; index += 4) {
    const hour = parseInt(v[index], 10);
    const minute = parseInt(v[index + 1], 10);
    const temp = ((v[index + 2] << 8) + v[index + 3]) / 10.0;
    schedule.push(
      `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}/${temp.toFixed(1)}`
    );
  }
  return schedule.join(' ');
}

/**
 * Marshal multi-DP schedule format
 * @param {string} scheduleString - Schedule string
 * @param {number} transitionCount - Number of transitions (default 4)
 * @param {number} dayNum - Day number (0 for all)
 * @returns {Array<number>}
 */
function marshalScheduleMultiDP(scheduleString, transitionCount = 4, dayNum = 0) {
  const payload = [dayNum];
  const transitions = scheduleString.split(' ');

  if (transitions.length !== transitionCount) {
    throw new Error(`Invalid schedule: should have ${transitionCount} transitions`);
  }

  for (const transition of transitions) {
    const [time, temp] = transition.split('/');
    const [hour, min] = time.split(':').map(Number);
    const temperature = Math.floor(parseFloat(temp) * 10);

    if (hour < 0 || hour > 24 || min < 0 || min > 60 || 
        temperature < 50 || temperature > 350) {
      throw new Error(`Invalid transition: ${transition}`);
    }

    payload.push(hour, min, (temperature >> 8) & 0xFF, temperature & 0xFF);
  }

  return payload;
}

// ============================================================================
// ENERGY METER PHASE PARSERS
// ============================================================================

/**
 * Parse phase data variant 1 (voltage + current)
 * @param {string} v - Base64 encoded data
 * @returns {Object} - {voltage, current}
 */
function parsePhaseVariant1(v) {
  const buffer = Buffer.from(v, 'base64');
  return {
    voltage: ((buffer[13] << 8) | buffer[14]) / 10,
    current: ((buffer[11] << 8) | buffer[12]) / 1000
  };
}

/**
 * Parse phase data variant 2 (voltage + current + power)
 * @param {string} v - Base64 encoded data
 * @returns {Object} - {voltage, current, power}
 */
function parsePhaseVariant2(v) {
  const buf = Buffer.from(v, 'base64');
  return {
    voltage: ((buf[0] << 8) | buf[1]) / 10,
    current: ((buf[3] << 8) | buf[4]) / 1000,
    power: (buf[6] << 8) | buf[7]
  };
}

/**
 * Parse phase data variant 2 with phase label (handles negative power)
 * @param {string} v - Base64 encoded data
 * @param {string} phase - Phase label (a, b, c)
 * @returns {Object}
 */
function parsePhaseVariant2WithPhase(v, phase) {
  const buf = Buffer.from(v, 'base64');
  let power = (buf[6] << 8) | buf[7];
  
  // Handle negative power readings
  if (power > 0x7FFF) {
    power = (0x999A - power) * -1;
  }

  return {
    [`voltage_${phase}`]: ((buf[0] << 8) | buf[1]) / 10,
    [`current_${phase}`]: ((buf[3] << 8) | buf[4]) / 1000,
    [`power_${phase}`]: power
  };
}

/**
 * Parse phase data variant 3 (3-byte current, 3-byte power)
 * @param {string} v - Base64 encoded data
 * @returns {Object} - {voltage, current, power}
 */
function parsePhaseVariant3(v) {
  const buf = Buffer.from(v, 'base64');
  return {
    voltage: ((buf[0] << 8) | buf[1]) / 10,
    current: ((buf[2] << 16) | (buf[3] << 8) | buf[4]) / 1000,
    power: (buf[5] << 16) | (buf[6] << 8) | buf[7]
  };
}

/**
 * Parse threshold data (over current/voltage protection)
 * @param {string} v - Base64 encoded data
 * @returns {Object}
 */
function parseThreshold(v) {
  const buffer = Buffer.from(v, 'base64');
  const stateLookup = { 0: 'not_set', 1: 'over_current_threshold', 3: 'over_voltage_threshold' };
  const protectionLookup = { 0: 'OFF', 1: 'ON' };

  return {
    threshold_1_protection: protectionLookup[buffer[1]],
    threshold_1: stateLookup[buffer[0]],
    threshold_1_value: (buffer[2] << 8) | buffer[3],
    threshold_2_protection: protectionLookup[buffer[5]],
    threshold_2: stateLookup[buffer[4]],
    threshold_2_value: (buffer[6] << 8) | buffer[7]
  };
}

// ============================================================================
// DP VALUE CREATORS
// ============================================================================

/**
 * Create DP value for number (32-bit integer)
 * @param {number} dp - DP number
 * @param {number} value - Value
 * @returns {Object}
 */
function dpValueFromNumber(dp, value) {
  return {
    dp,
    datatype: DATA_TYPES.number,
    data: Buffer.from(convertDecimalValueTo4ByteHexArray(value))
  };
}

/**
 * Create DP value for boolean
 * @param {number} dp - DP number
 * @param {boolean} value - Value
 * @returns {Object}
 */
function dpValueFromBool(dp, value) {
  return {
    dp,
    datatype: DATA_TYPES.bool,
    data: Buffer.from([value ? 1 : 0])
  };
}

/**
 * Create DP value for enum
 * @param {number} dp - DP number
 * @param {number} value - Value (0-255)
 * @returns {Object}
 */
function dpValueFromEnum(dp, value) {
  return {
    dp,
    datatype: DATA_TYPES.enum,
    data: Buffer.from([value])
  };
}

/**
 * Create DP value for string
 * @param {number} dp - DP number
 * @param {string} value - String value
 * @returns {Object}
 */
function dpValueFromString(dp, value) {
  return {
    dp,
    datatype: DATA_TYPES.string,
    data: Buffer.from(convertStringToHexArray(value))
  };
}

/**
 * Create DP value for raw buffer
 * @param {number} dp - DP number
 * @param {Buffer} value - Raw buffer
 * @returns {Object}
 */
function dpValueFromRaw(dp, value) {
  return {
    dp,
    datatype: DATA_TYPES.raw,
    data: value
  };
}

/**
 * Create DP value for bitmap
 * @param {number} dp - DP number
 * @param {number} value - Bitmap value
 * @returns {Object}
 */
function dpValueFromBitmap(dp, value) {
  return {
    dp,
    datatype: DATA_TYPES.bitmap,
    data: Buffer.from([value])
  };
}

// ============================================================================
// INCHING SWITCH CONVERTER
// ============================================================================

/**
 * Parse inching switch data
 * @param {Buffer} data - Inching data
 * @param {number} quantity - Number of endpoints
 * @returns {Object}
 */
function parseInchingSwitch(data, quantity = 1) {
  const result = {};
  
  for (let i = 0; i < quantity; i++) {
    const offset = i * 3;
    if (offset + 2 < data.length) {
      result[`inching_control_${i + 1}`] = data[offset] === 1 ? 'ENABLE' : 'DISABLE';
      result[`inching_time_${i + 1}`] = (data[offset + 1] << 8) | data[offset + 2];
    }
  }
  
  return result;
}

/**
 * Marshal inching switch data
 * @param {Object} settings - Inching settings
 * @param {number} quantity - Number of endpoints
 * @returns {Buffer}
 */
function marshalInchingSwitch(settings, quantity = 1) {
  const payload = [];
  
  for (let i = 0; i < quantity; i++) {
    const control = settings[`inching_control_${i + 1}`] === 'ENABLE' ? 1 : 0;
    const time = settings[`inching_time_${i + 1}`] || 0;
    payload.push(control, (time >> 8) & 0xFF, time & 0xFF);
  }
  
  return Buffer.from(payload);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Data types
  DATA_TYPES,
  
  // Weather
  WEATHER_CONDITIONS,
  WEATHER_IDS,
  BACKLIGHT_COLORS,
  
  // Core functions
  convertBufferToNumber,
  convertStringToHexArray,
  convertDecimalValueTo2ByteHexArray,
  convertDecimalValueTo4ByteHexArray,
  getDataValue,
  
  // Value converters
  valueConverterBasic,
  valueConverter,
  
  // Schedule
  parseSchedule,
  marshalSchedule,
  parseScheduleMultiDP,
  marshalScheduleMultiDP,
  
  // Energy meter
  parsePhaseVariant1,
  parsePhaseVariant2,
  parsePhaseVariant2WithPhase,
  parsePhaseVariant3,
  parseThreshold,
  
  // DP creators
  dpValueFromNumber,
  dpValueFromBool,
  dpValueFromEnum,
  dpValueFromString,
  dpValueFromRaw,
  dpValueFromBitmap,
  
  // Inching
  parseInchingSwitch,
  marshalInchingSwitch
};
