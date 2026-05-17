'use strict';

const { containsCI, normalize } = require('../utils/CaseInsensitiveMatcher');

/**
 * TuyaSensorDatabase - v9.0.0
 * Centralized registry for all Tuya sensor DP mappings and quirks.
 * This file consolidates knowledge from Z2M, ZHA, and forum reports.
 */

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
      '_TZE204_r0jdjrvi',
      '_TZE204_sfiy5tfs', '_TZE204_wukb7rhc',
      '_TZE204_iaeejhvf',
      '_TZE204_ikvncluo', '_TZE204_jva8ink8',
      '_TZE204_lyetpprm', '_TZE204_no6qtgtl',
    ],
    battery: false,
    noTemperature: true,
    noHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },
      2: { cap: null, internal: 'sensitivity' },
      3: { cap: null, internal: 'near_distance' },
      4: { cap: null, internal: 'far_distance' },
      9: { cap: 'measure_luminance.distance', divisor: 100 },
      12: { cap: 'measure_luminance', type: 'lux_direct' },
      101: { cap: null, internal: 'static_sensitivity' },
      102: { cap: null, internal: 'motion_sensitivity' },
    }
  },

  'ZY_M100_CEILING_24G': {
    sensors: ['_TZE200_gkfbdvyx', '_TZE204_gkfbdvyx'],
    battery: false,
    mainsPowered: true,
    hasIlluminance: true,
    presenceEnumMapping: { 0: false, 1: true, 2: true },
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum_gkfbdvyx', enumMap: { 0: false, 1: true, 2: true } },
      2: { cap: null, internal: 'move_sensitivity' },
      3: { cap: null, internal: 'detection_distance_min', divisor: 100 },
      4: { cap: null, internal: 'detection_distance_max', divisor: 100 },
      9: { cap: 'measure_luminance.distance', divisor: 100 },
      101: { cap: null, internal: 'distance_tracking' },
      102: { cap: null, internal: 'presence_sensitivity' },
      103: { cap: 'measure_luminance', type: 'lux_direct' },
      104: { cap: 'alarm_motion', type: 'presence_enum_gkfbdvyx', enumMap: { 0: false, 1: true, 2: true } },
      105: { cap: null, internal: 'fading_time' },
    }
  },

  'ZG_204ZV_MULTISENSOR': {
    sensors: [
      '_TZE200_grgol3xp', '_TZE204_grgol3xp',
      '_TZE200_uli8wasj', '_TZE204_uli8wasj',
      'HOBEIAN',
      '_TZ3000_8bxrzyxz', '_TZ3000_8BXRZYXZ',
    ],
    modelId: 'ZG-204ZV',
    battery: true,
    hasIlluminance: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      3: { cap: 'measure_temperature', divisor: 10 },
      4: { cap: 'measure_humidity', multiplier: 10 },
      9: { cap: 'measure_luminance', type: 'lux_direct' },
      10: { cap: 'measure_battery', divisor: 1 },
      17: { cap: 'alarm_generic', type: 'bool', flowTrigger: 'sos_pressed' },
      18: { cap: 'alarm_generic', type: 'bool', flowTrigger: 'sos_pressed' },
      101: { cap: 'measure_humidity', divisor: 1 },
      106: { cap: 'measure_luminance', type: 'lux_direct' },
      110: { cap: 'measure_battery', divisor: 1 },
      111: { cap: 'measure_temperature', divisor: 10 },
    }
  },

  'TZE284_IADRO9BF': {
    sensors: [
      '_TZE284_iadro9bf', '_TZE204_iadro9bf', '_TZE204_qasjif9e', '_TZE284_qasjif9e',
      '_TZE204_ztqnh5cg', '_TZE284_ztqnh5cg', '_TZE204_sbyx0lm6', '_TZE284_sbyx0lm6',
      '_TZE284_debczeci', '_TZE284_4qznlkbu', '_TZE284_ar5przmw', '_TZE284_o9ofysmo',
      '_TZE284_rlytpmij', '_TZE284_xc3vwx5a', '_TZE284_pzm3wab5', '_TZE284_twybxdzl',
      '_TZE284_hgeqeyuv', '_TZE284_vceqncho', '_TZE284_who1jxwd', '_TZE284_9ovska9w',
      '_TZE284_bquwrqh1', '_TZE284_gw05grph', '_TZE284_chcnj5st', '_TZE200_qasjif9e',
      '_TZE200_ya4ft0w4', '_TZE204_ya4ft0w4', '_TZE200_sgfmfpiy', '_TZE204_sgfmfpiy',
      '_TZE200_ikvncluo', '_TZE200_nbkshs6k', '_TZE204_nbkshs6k', '_TZE204_bvfld3xc',
      '_TZE204_sbkgeilo', '_TZE200_f1pvdgoh', '_TZE200_hyhl5y36', '_TZE204_b8vxct9l',
      '_TZE204_hyt4iucb', '_TZE200_juzago6i', '_TZ3218_ewrxirng',
    ],
    battery: false,
    mainsPowered: true,
    useIntelligentInference: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool', useInference: true, unreliable: true },
      2: { cap: null, setting: 'radar_sensitivity', min: 0, max: 9 },
      3: { cap: null, setting: 'min_range', divisor: 100 },
      4: { cap: null, setting: 'max_range', divisor: 100, feedInference: true },
      9: { cap: 'measure_luminance.distance', divisor: 100, feedInference: true, primaryInference: true },
      12: { cap: 'measure_luminance', type: 'lux_direct', ultraSmooth: true },
      101: { cap: null, setting: 'detection_delay', divisor: 10 },
      102: { cap: null, setting: 'fading_time', divisor: 10 },
      104: { cap: 'alarm_motion', type: 'presence_enum', enumMap: { 0: false, 1: true, 2: true } },
    }
  },

  'TZE284_SERIES_HIGH_DP': {
    sensors: [
      '_TZE284_n5q2t8na', '_TZE284_ztc6ggyl', '_TZE284_ijxvkhd0', '_TZE284_sxm7l9xa',
      '_TZE284_xsm7l9xa', '_TZE284_yrwmnya3', '_TZE204_ijxvkhd0', '_TZE204_e5m9c5hl',
      '_TZE204_kyhbrfyl', '_TZE204_ex3rcdha', '_TZE200_ztc6ggyl', '_TZE204_ztc6ggyl',
      '_TZE204_sxm7l9xa',
    ],
    dpMap: {
      104: { cap: 'measure_luminance', type: 'lux_direct' },
      105: { cap: 'alarm_motion', type: 'presence_enum' },
      106: { cap: null, setting: 'radar_sensitivity', min: 1, max: 9 },
      107: { cap: null, setting: 'max_range', divisor: 100 },
      108: { cap: null, setting: 'min_range', divisor: 100 },
      109: { cap: 'measure_luminance.distance', divisor: 100 },
      110: { cap: null, setting: 'fading_time', divisor: 10 },
      111: { cap: null, setting: 'detection_delay', divisor: 10 },
      112: { cap: 'alarm_motion', type: 'presence_bool' },
    }
  },

  'AIR_QUALITY_SMART_BOX': {
    sensors: [
      '_TZE200_8ygsuhe1', '_TZE200_y6rqas8p', '_TZE200_dwcarsat',
      '_TZE200_ry9vscjx', '_TZE204_ry9vscjx',
    ],
    dpMap: {
      2: { cap: 'measure_co2', divisor: 1 },
      18: { cap: 'measure_temperature', divisor: 10 },
      19: { cap: 'measure_humidity', divisor: 10 },
      20: { cap: 'measure_pm25', divisor: 1 },
      21: { cap: 'measure_voc', divisor: 1 },
      22: { cap: 'measure_formaldehyde', divisor: 100 }
    }
  },

  'FORMALDEHYDE_SENSOR': {
    sensors: ['_TZE200_8ygsuhe1', '_TZE200_y6rqas8p'], // Some overlap with SmartBox
    dpMap: {
      1: { cap: 'measure_temperature', divisor: 10 },
      2: { cap: 'measure_humidity', divisor: 10 },
      18: { cap: 'measure_pm25', divisor: 1 },
      19: { cap: 'measure_co2', divisor: 1 },
      20: { cap: 'measure_voc', divisor: 1 },
      21: { cap: 'measure_formaldehyde', divisor: 100 }
    }
  },

  'DEFAULT': {
    sensors: [],
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },
      9: { cap: 'measure_luminance.distance', divisor: 100 },
      12: { cap: 'measure_luminance', type: 'lux_direct' },
      104: { cap: 'measure_luminance', type: 'lux_direct' },
      105: { cap: 'alarm_motion', type: 'presence_enum' },
      109: { cap: 'measure_luminance.distance', divisor: 100 },
      112: { cap: 'alarm_motion', type: 'presence_bool' },
      119: { cap: 'alarm_motion', type: 'presence_bool' },
    }
  }
};

const MANUFACTURER_CONFIG_MAP = {};
for (const [configName, config] of Object.entries(SENSOR_CONFIGS)) {
  for (const mfr of config.sensors) {
    MANUFACTURER_CONFIG_MAP[normalize(mfr)] = { ...config, configName };
  }
}

function getSensorConfig(manufacturerName, modelId = null) {
  const mfrKey = normalize(manufacturerName);
  
  if (mfrKey === 'hobeian') {
    if (modelId === 'ZG-204ZM') return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZM, configName: 'HOBEIAN_ZG204ZM' };
    if (modelId === 'ZG-204ZV') return { ...SENSOR_CONFIGS.ZG_204ZV_MULTISENSOR, configName: 'ZG_204ZV_MULTISENSOR' };
    if (modelId === 'ZG-227Z') return { ...SENSOR_CONFIGS.HOBEIAN_10G_MULTI, configName: 'HOBEIAN_10G_MULTI' };
  }

  if (MANUFACTURER_CONFIG_MAP[mfrKey]) return MANUFACTURER_CONFIG_MAP[mfrKey];

  // Pattern matching fallback
  if (containsCI(manufacturerName, 'iadro9bf') || containsCI(manufacturerName, 'qasjif9e')) {
    return { ...SENSOR_CONFIGS.TZE284_IADRO9BF, configName: 'TZE284_IADRO9BF' };
  }

  return SENSOR_CONFIGS.DEFAULT;
}

module.exports = {
  SENSOR_CONFIGS,
  getSensorConfig
};
