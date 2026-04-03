'use strict';

/**
 * TuyaDataPointsZ2M.js - Zigbee2MQTT Tuya Enrichment (EXPANDED)
 * 
 * Source: https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/lib/tuya.ts
 * 
 * Comprehensive Tuya DP definitions, value converters, and helpers from Z2M.
 * This provides:
 * - Data type definitions
 * - Value converters (lookup, scale, divideBy, etc.)
 * - Device fingerprints and manufacturer mappings
 * - Color converters (HSV, RGB, color temperature)
 * - Presence/radar sensor helpers
 * - Lock and access control helpers
 * - Schedule parsing/marshaling
 * - Energy meter phase parsing
 * - Garage door and irrigation helpers
 * 
 * v5.5.763: Expanded Z2M enrichment with color, presence, locks, fingerprints
 * v5.5.822: Fresh Z2M sync + GitHub user interviews (dlnraja issues #113-#115)
 * 
 * NOTE: This file complements (not conflicts with):
 * - TuyaDataPointsJohan.js: Versioned DP definitions per device type
 * - TuyaDataPointsComplete.js: Cluster and command definitions
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
// TUYA FINGERPRINTS - Device Identification (Z2M Style)
// ============================================================================

/**
 * Known Tuya device fingerprints by category
 * Used for device identification and capability mapping
 */
const TUYA_FINGERPRINTS = {
  // TRV (Thermostatic Radiator Valves)
  // v5.5.822: Added from Z2M tuya.ts fresh sync
  TRV: [
    '_TZE200_ckud7u2l', '_TZE200_ywdxldoj', '_TZE200_cwnjrr72', '_TZE200_b6wax7g0',
    '_TZE200_zuhszj9s', '_TZE200_aoclfnxz', '_TZE200_2atgpdho', '_TZE200_hvaxb2tc',
    '_TZE200_c88teujp', '_TZE200_azqp6ssj', '_TZE200_9gvruqf5', '_TZE200_fhn3negr',
    '_TZE200_husqqvux', '_TZE200_kly8gjlz', '_TZE200_lnbfnyxd', '_TZE200_mudxchsu',
    '_TZE204_ckud7u2l', '_TZE204_aoclfnxz', '_TZE204_cjbofhxw', '_TZE284_o3x45p96',
    // v5.5.822: Z2M fresh - radiator valves
    '_TZE200_rufdtfyv', '_TZE200_rk1wojce', '_TZE200_rndg81sf', '_TZE200_qjp4ynvi',
    '_TZE200_xby0s3ta', '_TZE200_cpmgn2cf', '_TZE200_p3dbf6qs', '_TZE200_wv90ladg',
  ],
  
  // Presence/Radar Sensors
  PRESENCE: [
    '_TZE200_ztc6ggyl', '_TZE204_ztc6ggyl', '_TZE200_ikvncluo', '_TZE200_lyetpprm',
    '_TZE200_wukb7rhc', '_TZE200_jva8ink8', '_TZE200_mrf6vtua', '_TZE200_ar0slwnd',
    '_TZE200_sfiy5tfs', '_TZE200_holel4dk', '_TZE200_xpq2rzhq', '_TZE204_xpq2rzhq',
    '_TZE204_sxm7l9xa', '_TZE204_e5m9c5hl', '_TZE200_2aaelwxk', '_TZE204_2aaelwxk',
  ],
  
  // Smart Locks
  LOCK: [
    '_TZE200_jhgdfpij', '_TZE200_n7ztxjac', '_TZE200_xfrhklux', '_TZE204_xfrhklux',
    '_TZE200_ygbkn7n2', '_TZE200_bknpvncf', '_TZE200_odzlr57w', '_TZE200_4r3m8lfl',
  ],
  
  // Curtain/Blind Motors
  CURTAIN: [
    '_TZE200_cowvfni3', '_TZE200_wmcdj3aq', '_TZE200_fctwhugx', '_TZE200_rddyvrci',
    '_TZE200_nkoabg8w', '_TZE200_xuzcvlku', '_TZE200_4vobcgpe', '_TZE200_nogaemzt',
    '_TZE200_r0jdjrvi', '_TZE200_zpzndjez', '_TZE204_r0jdjrvi', '_TZE200_iossyxra',
    '_TZ3000_bs93npae', '_TZ3000_vd43bbfq', '_TZ3000_8kzqqzu4', '_TZ3000_femsaaua',
  ],
  
  // Dimmers
  DIMMER: [
    '_TZE200_e3oitdyu', '_TZE200_whpb9yts', '_TZE200_ebwgzdqq', '_TZE200_9i9dt8is',
    '_TZE200_dfxkcots', '_TZE200_w4cryh2i', '_TZE200_ip2akl4w', '_TZE204_zenj4lxv',
    '_TZE200_la2c2uo9', '_TZE204_hlx9tnzb', '_TZE204_bxoo2swd', '_TZ3210_ngqk6jia',
  ],
  
  // Smart Plugs with Energy Monitoring
  PLUG_ENERGY: [
    '_TZ3210_w0qqde0g', '_TZ3000_w0qqde0g', '_TZ3000_dpo1ysak', '_TZ3000_cehuw1lw',
    '_TZ3000_g5xawfcq', '_TZ3000_rdtixbnu', '_TZ3000_typdpbpg', '_TZ3000_zloso4jk',
    '_TZ3000_ynmowqk2', '_TZ3000_zwaadvus', '_TZ3210_2uollq9d', '_TZ3210_cehuw1lw',
  ],
  
  // Garage Door Controllers
  GARAGE: [
    '_TZE200_wfxuhoea', '_TZE200_nklqjk62', '_TZE200_yoswsxby', '_TZE204_nklqjk62',
  ],
  
  // Irrigation Controllers
  IRRIGATION: [
    '_TZE200_sh1btabb', '_TZE200_a7sghmms', '_TZE200_akjefhj5', '_TZE284_aojd2hoc',
    '_TZE200_81isopgh', '_TZE200_2wg5qelp', '_TZE204_81isopgh',
  ],
  
  // Smoke/Gas Detectors
  SMOKE_GAS: [
    '_TZE200_dq1mfjug', '_TZE200_m402kbvp', '_TZE200_ntcy3xu1', '_TZE200_rccxox8p',
    '_TZE200_yojqa8xn', '_TZE200_aycxwiau', '_TZE200_vzekyi4c', '_TZE284_rccxox8p',
  ],
  
  // Air Quality Sensors
  AIR_QUALITY: [
    '_TZE200_dwcarsat', '_TZE200_ryfmq5rl', '_TZE200_mja3fuja', '_TZE200_ogkdpgy2',
    '_TZE200_yvx5lh6k', '_TZE204_upagmta9', '_TZE204_mhxn2jso',
  ],
  
  // Scene Switches / Buttons
  SCENE_SWITCH: [
    '_TZ3000_xabckq1v', '_TZ3000_wkai4ga5', '_TZ3000_5tqxpine', '_TZ3000_zgyzgdua',
    '_TZ3000_vp6clf9d', '_TZ3000_iszegwpd', '_TZ3000_qzjcsmar', '_TZ3000_dfgbtub0',
    '_TZ3000_w8jwkczz', '_TZ3000_pbra2mjv', '_TZ3000_ja5osu5g', '_TZ3000_owgcnkrh',
    // v5.5.822: GitHub issue #114 - Smart Button TS0041
    '_TZ3000_b4awzgct', '_TZ3000_gwkzibhs',
  ],

  // v5.5.822: Climate Sensors (from Z2M TS0201 definitions + GitHub issue #115)
  CLIMATE: [
    '_TZ3000_fllyghyj', '_TZ3000_saiqcn0y', '_TZ3000_bjawzodf', '_TZ3000_bguser20',
    '_TZ3000_yd2e749y', '_TZ3000_6uzkisv2', '_TZ3000_xr3htd96', '_TZ3000_dowj6gyi',
    '_TZ3000_8ybe88nf', '_TZ3000_akqdg6g7', '_TZ3000_zl1kmjqx', '_TZ3000_isw9u95y',
    '_TZ3000_yupc0pb7', '_TZ3000_bgsigers', '_TZ3210_alxkwn0h', '_TZ3000_0s1izerx',
    '_TZ3000_v1w2k9dd', '_TZ3000_rdhukkmi', '_TZ3000_lqmvrwa2', '_TZ3000_f2bw0b6k',
    '_TZ3000_mxzo5rhf', '_TZ3000_1twfmkcc', '_TZ3000_fie1dpkm',
  ],

  // v5.5.822: Energy Meters (from Z2M DIN rail meters)
  ENERGY_METER: [
    '_TZE200_lsanae15', '_TZE204_lsanae15', '_TZE200_rhblgy0z', '_TZE204_rhblgy0z',
    '_TZE200_byzdayie', '_TZE200_fsb6zw01', '_TZE200_ewxhg6o9', '_TZE204_ugekduaj',
    '_TZE200_ugekduaj', '_TZE204_loejka0i', '_TZE284_loejka0i', '_TZE204_gomuk3dc',
    '_TZE284_gomuk3dc', '_TZE200_gomuk3dc', '_TZE200_rks0sgb7', '_TZE204_81yrt3lo',
  ],

  // v5.5.822: USB Outlets (from Z2M TS011F variants)
  USB_OUTLET: [
    '_TZ3000_3zofvcaa', '_TZ3000_pvlvoxvt', '_TZ3000_lqb7lcq9', '_TZ3210_urjf5u18',
    '_TZ3210_8n4dn1ne', '_TZ3000_bep7ccew', '_TZ3000_gazjngjl',
  ],
};

// ============================================================================
// COLOR CONVERTERS (Z2M Style)
// ============================================================================

/**
 * Color modes for Tuya lights
 */
const COLOR_MODES = {
  WHITE: 0,
  COLOR: 1,
  SCENE: 2,
  MUSIC: 3,
};

/**
 * Convert HSV to RGB
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} v - Value/Brightness (0-100)
 * @returns {{r: number, g: number, b: number}}
 */
function hsvToRgb(h, s, v) {
  h = h / 360;
  s = s / 100;
  v = v / 100;
  
  let r, g, b;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/**
 * Convert RGB to HSV
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {{h: number, s: number, v: number}}
 */
function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  let h = 0;
  const s = max === 0 ? 0 : diff / max;
  const v = max;
  
  if (diff !== 0) {
    switch (max) {
      case r: h = ((g - b) / diff + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / diff + 2) / 6; break;
      case b: h = ((r - g) / diff + 4) / 6; break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100)
  };
}

/**
 * Convert Tuya color data to HSV
 * Format: HHHHSSSSBBBB (12 hex chars)
 * @param {string} colorData - Tuya color hex string
 * @returns {{h: number, s: number, v: number}}
 */
function tuyaToHsv(colorData) {
  if (!colorData || colorData.length < 12) return { h: 0, s: 0, v: 0 };
  
  return {
    h: parseInt(colorData.substring(0, 4), 16),
    s: parseInt(colorData.substring(4, 8), 16) / 10,
    v: parseInt(colorData.substring(8, 12), 16) / 10
  };
}

/**
 * Convert HSV to Tuya color format
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} v - Value (0-100)
 * @returns {string}
 */
function hsvToTuya(h, s, v) {
  const hHex = h.toString(16).padStart(4, '0');
  const sHex = Math.round(s * 10).toString(16).padStart(4, '0');
  const vHex = Math.round(v * 10).toString(16).padStart(4, '0');
  return hHex + sHex + vHex;
}

/**
 * Convert Kelvin color temperature to Tuya value (0-1000)
 * @param {number} kelvin - Color temperature in Kelvin (2700-6500)
 * @returns {number}
 */
function kelvinToTuya(kelvin) {
  const minKelvin = 2700;
  const maxKelvin = 6500;
  const clamped = Math.max(minKelvin, Math.min(maxKelvin, kelvin));
  return Math.round(((clamped - minKelvin) / (maxKelvin - minKelvin)) * 1000);
}

/**
 * Convert Tuya color temperature value to Kelvin
 * @param {number} tuyaValue - Tuya value (0-1000)
 * @returns {number}
 */
function tuyaToKelvin(tuyaValue) {
  const minKelvin = 2700;
  const maxKelvin = 6500;
  return Math.round(minKelvin + (tuyaValue / 1000) * (maxKelvin - minKelvin));
}

/**
 * Convert Mired to Tuya color temperature
 * @param {number} mired - Color temperature in Mired
 * @returns {number}
 */
function miredToTuya(mired) {
  const kelvin = Math.round(1000000 / mired);
  return kelvinToTuya(kelvin);
}

/**
 * Convert Tuya color temperature to Mired
 * @param {number} tuyaValue - Tuya value (0-1000)
 * @returns {number}
 */
function tuyaToMired(tuyaValue) {
  const kelvin = tuyaToKelvin(tuyaValue);
  return Math.round(1000000 / kelvin);
}

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
  lockUnlock: valueConverterBasic.lookup({ LOCK: true, UNLOCK: false }),

  // Thermostat presets (Z2M standard)
  thermostatPreset: valueConverterBasic.lookup({
    schedule: 0, manual: 1, boost: 2, complex: 3, comfort: 4, eco: 5, away: 6, holiday: 7
  }),
  thermostatPreset2: valueConverterBasic.lookup({
    auto: 0, manual: 1, away: 2
  }),
  thermostatSystemMode: valueConverterBasic.lookup({
    off: 0, auto: 1, heat: 2
  }),
  thermostatSystemMode2: valueConverterBasic.lookup({
    auto: 0, cool: 1, heat: 2, dry: 3, fan_only: 4
  }),
  thermostatRunningState: valueConverterBasic.lookup({
    idle: 0, heat: 1, cool: 2
  }),

  // Fan modes
  fanMode: valueConverterBasic.lookup({
    low: 0, medium: 1, high: 2, auto: 3
  }),
  fanMode2: valueConverterBasic.lookup({
    off: 0, low: 1, medium: 2, high: 3, on: 4, auto: 5
  }),
  fanDirection: valueConverterBasic.lookup({
    forward: 0, reverse: 1
  }),

  // Alarm/Siren modes
  alarmVolume: valueConverterBasic.lookup({
    mute: 0, low: 1, medium: 2, high: 3
  }),
  alarmMode: valueConverterBasic.lookup({
    disarmed: 0, arm_day_zones: 1, arm_night_zones: 2, arm_all_zones: 3, exit_delay: 4, entry_delay: 5
  }),

  // Lock states
  lockState: valueConverterBasic.lookup({
    unlocked: 0, locked: 1, not_fully_locked: 2
  }),
  lockAction: valueConverterBasic.lookup({
    unlock: 0, lock: 1, toggle: 2
  }),

  // Garage door states
  garageDoorState: valueConverterBasic.lookup({
    closed: 0, open: 1, opening: 2, closing: 3, stopped: 4
  }),
  garageDoorAction: valueConverterBasic.lookup({
    open: 0, close: 1, stop: 2
  }),

  // Curtain states
  curtainState: valueConverterBasic.lookup({
    open: 0, stop: 1, close: 2
  }),
  curtainState2: valueConverterBasic.lookup({
    opening: 0, closing: 1, stopped: 2
  }),
  curtainMotorDirection: valueConverterBasic.lookup({
    normal: 0, reversed: 1
  }),

  // Presence/Radar sensitivity
  presenceSensitivity: valueConverterBasic.lookup({
    low: 0, medium: 1, high: 2
  }),
  radarSensitivity: valueConverterBasic.scale(0, 10, 0, 10),

  // Irrigation modes
  irrigationMode: valueConverterBasic.lookup({
    duration: 0, capacity: 1
  }),
  irrigationState: valueConverterBasic.lookup({
    idle: 0, watering: 1
  }),

  // Smoke/Gas alarm states  
  smokeAlarmState: valueConverterBasic.lookup({
    normal: 0, alarm: 1, test: 2, silenced: 3
  }),
  gasAlarmState: valueConverterBasic.lookup({
    normal: 0, alarm: 1
  }),

  // Occupancy delay
  occupancyDelay: valueConverterBasic.divideBy(1),

  // Color mode
  colorMode: valueConverterBasic.lookup({
    white: 0, color: 1, scene: 2, music: 3
  }),

  // Brightness (0-1000 to 0-100)
  brightness1000: valueConverterBasic.scale(0, 1000, 0, 100),
  brightness254: valueConverterBasic.scale(0, 254, 0, 100)
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
// PRESENCE/RADAR SENSOR HELPERS
// ============================================================================

/**
 * Presence sensor DP definitions (Z2M style)
 */
const PRESENCE_DPS = {
  // Common presence DPs
  presence: 1,
  sensitivity: 2,
  nearDistance: 3,
  farDistance: 4,
  detectionDelay: 101,
  fadingTime: 102,
  illuminanceLux: 104,
  targetDistance: 9,
  
  // Advanced radar DPs
  radarSensitivity: 2,
  minimumRange: 3,
  maximumRange: 4,
  selfTest: 6,
  indicatorLight: 101,
  presenceTimeout: 102,
  motionState: 103,
  staticDistance: 105,
  motionDistance: 106,
};

/**
 * Parse presence sensor config
 * @param {Buffer} data - Raw config data
 * @returns {Object}
 */
function parsePresenceConfig(data) {
  if (!data || data.length < 4) return {};
  
  return {
    sensitivity: data[0],
    nearDistance: (data[1] << 8) | data[2],
    farDistance: (data[3] << 8) | data[4],
    detectionDelay: data[5] || 0,
    fadingTime: data[6] || 0
  };
}

// ============================================================================
// LOCK HELPERS
// ============================================================================

/**
 * Lock DP definitions
 */
const LOCK_DPS = {
  state: 1,          // Lock state (locked/unlocked)
  lock: 2,           // Lock command
  unlock: 3,         // Unlock command
  battery: 4,        // Battery percentage
  reverseState: 7,   // Reverse lock state
  childLock: 8,      // Child lock
  autoLock: 9,       // Auto lock enable
  autoLockTime: 10,  // Auto lock delay (seconds)
  wrongTries: 11,    // Wrong attempt count
  alarmVolume: 12,   // Alarm volume
  language: 13,      // Language setting
  awayMode: 14,      // Away mode
};

/**
 * Parse lock user entry
 * @param {Buffer} data - User data
 * @returns {Object}
 */
function parseLockUser(data) {
  if (!data || data.length < 8) return null;
  
  return {
    userId: data[0],
    userType: ['admin', 'normal', 'temporary', 'guest'][data[1]] || 'unknown',
    userName: String.fromCharCode(...data.slice(2, 10)).replace(/\0/g, ''),
    userStatus: data[10] === 1 ? 'enabled' : 'disabled'
  };
}

// ============================================================================
// GARAGE DOOR HELPERS  
// ============================================================================

/**
 * Garage door DP definitions
 */
const GARAGE_DPS = {
  trigger: 1,           // Trigger door action
  doorState: 2,         // Door state (open/closed/opening/closing)
  countdown: 3,         // Auto-close countdown
  doorContact: 101,     // Door contact sensor
  light: 102,           // Light control
  lightMode: 103,       // Light mode (on/off/auto)
  obstacleDetection: 104, // Obstacle detection
};

/**
 * Parse garage door state
 * @param {number} value - State value
 * @returns {string}
 */
function parseGarageDoorState(value) {
  const states = {
    0: 'closed',
    1: 'open', 
    2: 'opening',
    3: 'closing',
    4: 'stopped'
  };
  return states[value] || 'unknown';
}

// ============================================================================
// IRRIGATION HELPERS
// ============================================================================

/**
 * Irrigation controller DP definitions
 */
const IRRIGATION_DPS = {
  switch1: 1,           // Zone 1 switch
  switch2: 2,           // Zone 2 switch
  switch3: 3,           // Zone 3 switch
  switch4: 4,           // Zone 4 switch
  waterTime1: 101,      // Zone 1 water time (minutes)
  waterTime2: 102,      // Zone 2 water time
  waterTime3: 103,      // Zone 3 water time
  waterTime4: 104,      // Zone 4 water time
  countdown1: 105,      // Zone 1 remaining time
  countdown2: 106,      // Zone 2 remaining time
  countdown3: 107,      // Zone 3 remaining time
  countdown4: 108,      // Zone 4 remaining time
  battery: 11,          // Battery level
  mode: 12,             // Mode (duration/capacity)
  cycleTime: 13,        // Cycle time interval
};

/**
 * Parse irrigation schedule
 * @param {Buffer} data - Schedule data
 * @returns {Array}
 */
function parseIrrigationSchedule(data) {
  if (!data || data.length < 4) return [];
  
  const schedule = [];
  const entrySize = 5; // hour, minute, duration(2), days
  
  for (let i = 0; i < data.length; i += entrySize) {
    if (i + entrySize > data.length) break;
    
    schedule.push({
      hour: data[i],
      minute: data[i + 1],
      duration: (data[i + 2] << 8) | data[i + 3],
      days: data[i + 4] // Bitmap: bit 0 = Sunday, bit 6 = Saturday
    });
  }
  
  return schedule;
}

// ============================================================================
// SMOKE/GAS DETECTOR HELPERS
// ============================================================================

/**
 * Smoke/Gas detector DP definitions
 */
const SMOKE_GAS_DPS = {
  smokeAlarm: 1,        // Smoke alarm state
  gasAlarm: 2,          // Gas alarm state
  coAlarm: 3,           // CO alarm state
  tamperAlarm: 4,       // Tamper alarm
  battery: 14,          // Battery percentage
  batteryState: 15,     // Battery state (normal/low)
  selfTest: 8,          // Self-test trigger
  silence: 16,          // Silence alarm
  sensitivity: 9,       // Sensitivity level
  preAlarmDuration: 101,// Pre-alarm duration
  alarmDuration: 102,   // Alarm duration
  preheatStatus: 103,   // Preheat status
};

// ============================================================================
// POWER-ON BEHAVIOR HELPERS
// ============================================================================

/**
 * Power-on behavior options
 */
const POWER_ON_BEHAVIORS = {
  OFF: 0,
  ON: 1,
  PREVIOUS: 2,
};

/**
 * Get power-on behavior name
 * @param {number} value - Behavior value
 * @returns {string}
 */
function getPowerOnBehaviorName(value) {
  const names = { 0: 'off', 1: 'on', 2: 'previous' };
  return names[value] || 'unknown';
}

// ============================================================================
// HELPER: DEVICE TYPE DETECTION
// ============================================================================

/**
 * Detect device type from manufacturer name
 * @param {string} manufacturerName - Tuya manufacturer name (e.g., "_TZE200_xxx")
 * @returns {string|null} - Device type or null
 */
function detectDeviceType(manufacturerName) {
  if (!manufacturerName) return null;
  
  const lower = manufacturerName.toLowerCase();
  
  for (const [type, fingerprints] of Object.entries(TUYA_FINGERPRINTS)) {
    for (const fp of fingerprints) {
      if (lower === fp.toLowerCase()) {
        return type;
      }
    }
  }
  
  return null;
}

/**
 * Check if manufacturer is in a specific category
 * @param {string} manufacturerName - Tuya manufacturer name
 * @param {string} category - Category to check (e.g., 'TRV', 'PRESENCE')
 * @returns {boolean}
 */
function isDeviceCategory(manufacturerName, category) {
  if (!manufacturerName || !TUYA_FINGERPRINTS[category]) return false;
  
  const lower = manufacturerName.toLowerCase();
  return TUYA_FINGERPRINTS[category].some(fp => fp.toLowerCase() === lower);
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
  marshalInchingSwitch,
  
  // Fingerprints
  TUYA_FINGERPRINTS,
  
  // Color
  COLOR_MODES,
  hsvToRgb,
  rgbToHsv,
  tuyaToHsv,
  hsvToTuya,
  kelvinToTuya,
  tuyaToKelvin,
  miredToTuya,
  tuyaToMired,
  
  // Presence/Radar
  PRESENCE_DPS,
  parsePresenceConfig,
  
  // Lock
  LOCK_DPS,
  parseLockUser,
  
  // Garage Door
  GARAGE_DPS,
  parseGarageDoorState,
  
  // Irrigation
  IRRIGATION_DPS,
  parseIrrigationSchedule,
  
  // Smoke/Gas
  SMOKE_GAS_DPS,
  
  // Power-on behavior
  POWER_ON_BEHAVIORS,
  getPowerOnBehaviorName,
  
  // Device detection
  detectDeviceType,
  isDeviceCategory
};
