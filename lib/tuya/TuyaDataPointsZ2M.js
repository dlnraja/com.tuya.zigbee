'use strict';
const CI = require('../utils/CaseInsensitiveMatcher');
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');


/**
 * TuyaDataPointsZ2M.js - Zigbee2MQTT Tuya Enrichment (EXPANDED)
 * 
 * Source: https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/lib/tuya.ts
 * 
 * Comprehensive Tuya DP definitions, value converters, and helpers from Z2M.
 */

const DATA_TYPES = {
  raw: 0,      // [ bytes ] - Raw data buffer
  bool: 1,     //[ 0/1 ] - Boolean
  number: 2,   // [ 4 byte value ] - 32-bit integer (big-endian)
  string: 3,   // [ N byte string ] - Variable length string
  enum: 4,     // [ 0-255 ] - Enumeration
  bitmap: 5,   // [ 1,2,4 bytes ] - Bitmap / bitfield
};

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

const TUYA_FINGERPRINTS = {
  TRV: [
    '_TZE200_ckud7u2l', '_TZE200_ywdxldoj', '_TZE200_cwnjrr72', '_TZE200_b6wax7g0',
    '_TZE200_zuhszj9s', '_TZE200_aoclfnxz', '_TZE200_2atgpdho', '_TZE200_hvaxb2tc',
    '_TZE200_c88teujp', '_TZE200_azqp6ssj', '_TZE200_9gvruqf5', '_TZE200_fhn3negr',
    '_TZE200_husqqvux', '_TZE200_kly8gjlz', '_TZE200_lnbfnyxd', '_TZE200_mudxchsu',
    '_TZE204_ckud7u2l', '_TZE204_aoclfnxz', '_TZE204_cjbofhxw', '_TZE284_o3x45p96',
    '_TZE200_rufdtfyv', '_TZE200_rk1wojce', '_TZE200_rndg81sf', '_TZE200_qjp4ynvi',
    '_TZE200_xby0s3ta', '_TZE200_cpmgn2cf', '_TZE200_p3dbf6qs', '_TZE200_wv90ladg',
  ],
  PRESENCE: [
    '_TZE200_ztc6ggyl', '_TZE204_ztc6ggyl', '_TZE200_ikvncluo', '_TZE200_lyetpprm',
    '_TZE200_wukb7rhc', '_TZE200_jva8ink8', '_TZE200_mrf6vtua', '_TZE200_ar0slwnd',
    '_TZE200_sfiy5tfs', '_TZE200_holel4dk', '_TZE200_xpq2rzhq', '_TZE204_xpq2rzhq',
    '_TZE204_sxm7l9xa', '_TZE204_e5m9c5hl', '_TZE200_2aaelwxk', '_TZE204_2aaelwxk',
  ],
  LOCK: [
    '_TZE200_jhgdfpij', '_TZE200_n7ztxjac', '_TZE200_xfrhklux', '_TZE204_xfrhklux',
    '_TZE200_ygbkn7n2', '_TZE200_bknpvncf', '_TZE200_odzlr57w', '_TZE200_4r3m8lfl',
  ],
  CURTAIN: [
    '_TZE200_cowvfni3', '_TZE200_wmcdj3aq', '_TZE200_fctwhugx', '_TZE200_rddyvrci',
    '_TZE200_nkoabg8w', '_TZE200_xuzcvlku', '_TZE200_4vobcgpe', '_TZE200_nogaemzt',
    '_TZE200_r0jdjrvi', '_TZE200_zpzndjez', '_TZE204_r0jdjrvi', '_TZE200_iossyxra',
    '_TZ3000_bs93npae', '_TZ3000_vd43bbfq', '_TZ3000_8kzqqzu4', '_TZ3000_femsaaua',
  ],
  DIMMER: [
    '_TZE200_e3oitdyu', '_TZE200_whpb9yts', '_TZE200_ebwgzdqq', '_TZE200_9i9dt8is',
    '_TZE200_dfxkcots', '_TZE200_w4cryh2i', '_TZE200_ip2akl4w', '_TZE204_zenj4lxv',
    '_TZE200_la2c2uo9', '_TZE204_hlx9tnzb', '_TZE204_bxoo2swd', '_TZ3210_ngqk6jia',
  ],
  PLUG_ENERGY: [
    '_TZ3210_w0qqde0g', '_TZ3000_w0qqde0g', '_TZ3000_dpo1ysak', '_TZ3000_cehuw1lw',
    '_TZ3000_g5xawfcq', '_TZ3000_rdtixbnu', '_TZ3000_typdpbpg', '_TZ3000_zloso4jk',
    '_TZ3000_ynmowqk2', '_TZ3000_zwaadvus', '_TZ3210_2uollq9d', '_TZ3210_cehuw1lw',
  ],
  GARAGE: [
    '_TZE200_wfxuhoea', '_TZE200_nklqjk62', '_TZE200_yoswsxby', '_TZE204_nklqjk62',
  ],
  IRRIGATION: [
    '_TZE200_sh1btabb', '_TZE200_a7sghmms', '_TZE200_akjefhj5', '_TZE284_aojd2hoc',
    '_TZE200_81isopgh', '_TZE200_2wg5qelp', '_TZE204_81isopgh',
  ],
  SMOKE_GAS: [
    '_TZE200_dq1mfjug', '_TZE200_m402kbvp', '_TZE200_ntcy3xu1', '_TZE200_rccxox8p',
    '_TZE200_yojqa8xn', '_TZE200_aycxwiau', '_TZE200_vzekyi4c', '_TZE284_rccxox8p',
  ],
  AIR_QUALITY: [
    '_TZE200_dwcarsat', '_TZE200_ryfmq5rl', '_TZE200_mja3fuja', '_TZE200_ogkdpgy2',
    '_TZE200_yvx5lh6k', '_TZE204_upagmta9', '_TZE204_mhxn2jso',
  ],
  SCENE_SWITCH: [
    '_TZ3000_xabckq1v', '_TZ3000_wkai4ga5', '_TZ3000_5tqxpine', '_TZ3000_zgyzgdua',
    '_TZ3000_vp6clf9d', '_TZ3000_iszegwpd', '_TZ3000_qzjcsmar', '_TZ3000_dfgbtub0',
    '_TZ3000_w8jwkczz', '_TZ3000_pbra2mjv', '_TZ3000_ja5osu5g', '_TZ3000_owgcnkrh',
    '_TZ3000_b4awzgct', '_TZ3000_gwkzibhs',
  ],
  CLIMATE: [
    '_TZ3000_fllyghyj', '_TZ3000_saiqcn0y', '_TZ3000_bjawzodf', '_TZ3000_bguser20',
    '_TZ3000_yd2e749y', '_TZ3000_6uzkisv2', '_TZ3000_xr3htd96', '_TZ3000_dowj6gyi',
    '_TZ3000_8ybe88nf', '_TZ3000_akqdg6g7', '_TZ3000_zl1kmjqx', '_TZ3000_isw9u95y',
    '_TZ3000_yupc0pb7', '_TZ3000_bgsigers', '_TZ3210_alxkwn0h', '_TZ3000_0s1izerx',
    '_TZ3000_v1w2k9dd', '_TZ3000_rdhukkmi', '_TZ3000_lqmvrwa2', '_TZ3000_f2bw0b6k',
    '_TZ3000_mxzo5rhf', '_TZ3000_1twfmkcc', '_TZ3000_fie1dpkm',
  ],
  ENERGY_METER: [
    '_TZE200_lsanae15', '_TZE204_lsanae15', '_TZE200_rhblgy0z', '_TZE204_rhblgy0z',
    '_TZE200_byzdayie', '_TZE200_fsb6zw01', '_TZE200_ewxhg6o9', '_TZE204_ugekduaj',
    '_TZE200_ugekduaj', '_TZE204_loejka0i', '_TZE284_loejka0i', '_TZE204_gomuk3dc',
    '_TZE284_gomuk3dc', '_TZE200_gomuk3dc', '_TZE200_rks0sgb7', '_TZE204_81yrt3lo',
  ],
  USB_OUTLET: [
    '_TZ3000_3zofvcaa', '_TZ3000_pvlvoxvt', '_TZ3000_lqb7lcq9', '_TZ3210_urjf5u18',
    '_TZ3210_8n4dn1ne', '_TZ3000_bep7ccew', '_TZ3000_gazjngjl',
  ],
};

const COLOR_MODES = {
  WHITE: 0,
  COLOR: 1,
  SCENE: 2,
  MUSIC: 3,
};

function hsvToRgb(h, s, v) {
  h = safeParse(h, 360);
  s = safeParse(s, 100) / 100;
  v = safeParse(v, 100) / 100;
  
  let r, g, b;
  const i = safeDivide(Math.floor(h, 60));
  const f = safeDivide(h, 60) - i;
  const p = v * (1 - s);
  const q = v * (1 - safeMultiply(f, s));
  const t = v * (1 - (1 - safeMultiply(f), s));
  
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  
  return {
    r: safeMultiply(Math.round(r, 255)),
    g: safeMultiply(Math.round(g, 255)),
    b: safeMultiply(Math.round(b, 255))
  };
}

function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  let h = 0;
  const s = max === 0 ? 0 : safeDivide(diff, max);
  const v = max;
  
  if (diff !== 0) {
    switch (max) {
      case r: h = (g - safeDivide(b), diff) + (g < b ? 6 : 0); break;
      case g: h = (b - safeDivide(r), diff) + 2; break;
      case b: h = (r - safeDivide(g), diff) + 4; break;
    }
    h /= 6;
  }
  
  return {
    h: safeMultiply(Math.round(h, 360)),
    s: Math.round(s * 100),
    v: Math.round(v * 100)
  };
}

function tuyaToHsv(colorData) {
  if (!colorData || colorData.length < 12) return { h: 0, s: 0, v: 0 };
  
  return {
    h: parseInt(colorData.substring(0, 4), 16),
    s: Math.round(parseInt(colorData.substring(4, 8), 16) / 10),
    v: Math.round(parseInt(colorData.substring(8, 12), 16) / 10)
  };
}

function hsvToTuya(h, s, v) {
  const hHex = Math.round(h).toString(16).padStart(4, '0');
  const sHex = safeMultiply(Math.round(s, 10)).toString(16).padStart(4, '0');
  const vHex = safeMultiply(Math.round(v, 10)).toString(16).padStart(4, '0');
  return hHex + sHex + vHex;
}

function kelvinToTuya(kelvin) {
  const minKelvin = 2700;
  const maxKelvin = 6500;
  const clamped = Math.max(minKelvin, Math.min(maxKelvin, kelvin));
  return Math.round(((clamped - minKelvin) / (maxKelvin - minKelvin)) * 1000);
}

function tuyaToKelvin(tuyaValue) {
  const minKelvin = 2700;
  const maxKelvin = 6500;
  return Math.round(minKelvin + (tuyaValue / 1000) * (maxKelvin - minKelvin));
}

function miredToTuya(mired) {
  const kelvin = safeDivide(Math.round(1000000, mired));
  return kelvinToTuya(kelvin);
}

function tuyaToMired(tuyaValue) {
  const kelvin = tuyaToKelvin(tuyaValue);
  return safeDivide(Math.round(1000000, kelvin));
}

function convertBufferToNumber(chunks) {
  if (!chunks || chunks.length === 0) return 0;
  let value = 0;
  for (let i = 0; i < chunks.length; i++) {
    value = (value << 8) + (chunks[i] & 0xFF);
  }
  return value;
}

function convertStringToHexArray(value) {
  const asciiKeys = [];
  for (let i = 0; i < value.length; i++) {
    asciiKeys.push(value.charCodeAt(i));
  }
  return asciiKeys;
}

function convertDecimalValueTo4ByteHexArray(value) {
  const intValue = Math.round(value);
  return [
    (intValue >> 24) & 0xFF,
    (intValue >> 16) & 0xFF,
    (intValue >> 8) & 0xFF,
    intValue & 0xFF
  ];
}

function convertDecimalValueTo2ByteHexArray(value) {
  const intValue = Math.round(value);
  return [(intValue >> 8) & 0xFF, intValue & 0xFF];
}

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

const valueConverterBasic = {
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

  raw: () => ({
    to: (v) => v,
    from: (v) => v
  }),

  divideBy: (value) => ({
    to: (v) => safeMultiply(v, value),
    from: (v) => safeDivide(v, value)
  }),
  
  divideByFromOnly: (value) => ({
    to: (v) => v,
    from: (v) => safeDivide(v, value)
  }),
  
  divideByWithLimits: (value, min, max) => ({
    to: (v) => {
      const result = safeMultiply(v, value);
      return Math.max(min, Math.min(max, result));
    },
    from: (v) => {
      const result = safeDivide(v, value);
      return Math.max(min, Math.min(max, result));
    }
  }),

  trueFalse: (valueTrue) => ({
    from: (v) => v === (valueTrue.valueOf ? valueTrue.valueOf() : valueTrue),
    to: (v) => v ? (valueTrue.valueOf ? valueTrue.valueOf() : valueTrue) : 0
  })
};

const valueConverter = {
  trueFalse0: valueConverterBasic.trueFalse(0), 
  trueFalse1: valueConverterBasic.trueFalse(1),
  trueFalseInvert: {
    to: (v) => !v,
    from: (v) => !v
  },
  onOff: valueConverterBasic.lookup({ ON: true, OFF: false }),
  powerOnBehavior: valueConverterBasic.lookup({ off: 0, on: 1, previous: 2 }),
  switchType: valueConverterBasic.lookup({ momentary: 0, toggle: 1, state: 2 }),
  switchType2: valueConverterBasic.lookup({ toggle: 0, state: 1, momentary: 2 }),
  switchTypeCurtain: valueConverterBasic.lookup({
    'flip-switch': 0,
    'sync-switch': 1,
    'button-switch': 2,
    'button2-switch': 3
  }),
  backlightModeOffNormalInverted: valueConverterBasic.lookup({ off: 0, normal: 1, inverted: 2 }),
  backlightModeOffLowMediumHigh: valueConverterBasic.lookup({ off: 0, low: 1, medium: 2, high: 3 }),
  lightType: valueConverterBasic.lookup({ led: 0, incandescent: 1, halogen: 2 }),
  lightMode: valueConverterBasic.lookup({ normal: 0, on: 1, off: 2, flash: 3 }),
  switchMode: valueConverterBasic.lookup({ switch: 0, scene: 1 }),
  switchMode2: valueConverterBasic.lookup({ switch: 0, curtain: 1 }),
  temperatureUnit: valueConverterBasic.lookup({ celsius: 0, fahrenheit: 1 }),
  batteryState: valueConverterBasic.lookup({ low: 0, medium: 1, high: 2 }),
  countdown: valueConverterBasic.raw(),
  raw: valueConverterBasic.raw(),
  scale0_254to0_1000: valueConverterBasic.scale(0, 254, 0, 1000),
  scale0_1to0_1000: valueConverterBasic.scale(0, 1, 0, 1000),
  divideBy2: valueConverterBasic.divideBy(2),
  divideBy10: valueConverterBasic.divideBy(10),
  divideBy100: valueConverterBasic.divideBy(100),
  divideBy1000: valueConverterBasic.divideBy(1000),
  divideBy10FromOnly: valueConverterBasic.divideByFromOnly(10),
  localTemperatureCalibration: {
    from: (value) => (value > 4000 ? value - 4096 : value),
    to: (value) => (value < 0 ? 4096 + value : value)
  },
  localTemperatureCalibration_256: {
    from: (value) => (value > 200 ? value - 256 : value),
    to: (value) => (value < 0 ? 256 + value : value)
  },
  coverPosition: {
    to: (v, options = {}) => options.invert_cover ? 100 - v : v,
    from: (v, options = {}) => options.invert_cover ? 100 - v : v
  },
  coverPositionInverted: {
    to: (v, options = {}) => options.invert_cover ? v : 100 - v,
    from: (v, options = {}) => options.invert_cover ? v : 100 - v
  },
  tubularMotorDirection: valueConverterBasic.lookup({ normal: 0, reversed: 1 }),
  plus1: {
    from: (v) => v + 1,
    to: (v) => v - 1
  },
  power: {
    from: (v) => v > 0x0FFFFFFF ? (0x1999999C - v) * -1 : v
  },
  selfTestResult: valueConverterBasic.lookup({ checking: 0, success: 1, failure: 2, others: 3 }),
  lockUnlock: valueConverterBasic.lookup({ LOCK: true, UNLOCK: false }),
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
  fanMode: valueConverterBasic.lookup({
    low: 0, medium: 1, high: 2, auto: 3
  }),
  fanMode2: valueConverterBasic.lookup({
    off: 0, low: 1, medium: 2, high: 3, on: 4, auto: 5
  }),
  fanDirection: valueConverterBasic.lookup({
    forward: 0, reverse: 1
  }),
  alarmVolume: valueConverterBasic.lookup({
    mute: 0, low: 1, medium: 2, high: 3
  }),
  alarmMode: valueConverterBasic.lookup({
    disarmed: 0, arm_day_zones: 1, arm_night_zones: 2, arm_all_zones: 3, exit_delay: 4, entry_delay: 5
  }),
  lockState: valueConverterBasic.lookup({
    unlocked: 0, locked: 1, not_fully_locked: 2
  }),
  lockAction: valueConverterBasic.lookup({
    unlock: 0, lock: 1, toggle: 2
  }),
  garageDoorState: valueConverterBasic.lookup({
    closed: 0, open: 1, opening: 2, closing: 3, stopped: 4
  }),
  garageDoorAction: valueConverterBasic.lookup({
    open: 0, close: 1, stop: 2
  }),
  curtainState: valueConverterBasic.lookup({
    open: 0, stop: 1, close: 2
  }),
  curtainState2: valueConverterBasic.lookup({
    opening: 0, closing: 1, stopped: 2
  }),
  curtainMotorDirection: valueConverterBasic.lookup({
    normal: 0, reversed: 1
  }),
  presenceSensitivity: valueConverterBasic.lookup({
    low: 0, medium: 1, high: 2
  }),
  radarSensitivity: valueConverterBasic.scale(0, 10, 0, 10),
  irrigationMode: valueConverterBasic.lookup({
    duration: 0, capacity: 1
  }),
  irrigationState: valueConverterBasic.lookup({
    idle: 0, watering: 1
  }),
  smokeAlarmState: valueConverterBasic.lookup({
    normal: 0, alarm: 1, test: 2, silenced: 3
  }),
  gasAlarmState: valueConverterBasic.lookup({
    normal: 0, alarm: 1
  }),
  occupancyDelay: valueConverterBasic.divideBy(1),
  colorMode: valueConverterBasic.lookup({
    white: 0, color: 1, scene: 2, music: 3
  }),
  brightness1000: valueConverterBasic.scale(0, 1000, 0, 100),
  brightness254: valueConverterBasic.scale(0, 254, 0, 100)
};

function parseSchedule(bytes, maxPeriods = 10) {
  if (!bytes || bytes.length < 3) return '';
  
  const schedule = [];
  const periodSize = 3;

  for (let i = 0; i < maxPeriods; i++) {
    const offset = safeMultiply(i, periodSize);
    if (offset + 2 >= bytes.length) break;

    const time = bytes[offset];
    const totalMinutes = safeMultiply(time, 10);
    const hours = safeDivide(Math.floor(totalMinutes, 60));
    const minutes = totalMinutes % 60;
    const temperature = (bytes[offset + 1] << 8) | bytes[offset + 2];

    schedule.push(
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}/${temperature}`
    );

    if (hours === 24) break;
  }

  return schedule.join(' ');
}

function marshalSchedule(scheduleString, dayBitmap = 127, maxPeriods = 10) {
  const payload = [dayBitmap];
  const schedule = scheduleString.split(' ');

  for (let i = 0; i < maxPeriods; i++) {
    if (i < schedule.length) {
      const parts = schedule[i].split('/');
      const timeParts = parts[0].split(':');
      const hours = parseInt(timeParts[0]);
      const minutes = parseInt(timeParts[1]);
      const temperature = parseInt(parts[1]);
      
      const totalMinutes = hours * 60 + minutes;
      payload.push(Math.round(totalMinutes  / 10));
      payload.push((temperature >> 8) & 0xFF);
      payload.push(temperature & 0xFF);
    } else {
      payload.push(0xFE, 0x00, 0x00); // End padding
    }
  }
  return Buffer.from(payload);
}

module.exports = {
  DATA_TYPES,
  WEATHER_CONDITIONS,
  WEATHER_IDS,
  BACKLIGHT_COLORS,
  TUYA_FINGERPRINTS,
  COLOR_MODES,
  hsvToRgb,
  rgbToHsv,
  tuyaToHsv,
  hsvToTuya,
  kelvinToTuya,
  tuyaToKelvin,
  miredToTuya,
  tuyaToMired,
  getDataValue,
  valueConverter,
  parseSchedule,
  marshalSchedule
};
