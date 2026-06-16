'use strict';

/**
 * Presence Sensor Configurations - v8.0.0
 * Separated from device.js for better maintainability
 */

// Helper to normalize strings for comparison
const normalize = (s) => (s || '').toLowerCase().trim();
const containsCI = (s, sub) => normalize(s).includes(normalize(sub));

const SENSOR_CONFIGS = {
  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE A: ZY-M100 Standard (most common)
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
      '_TZE204_sfiy5tfs',
      '_TZE204_iaeejhvf',
      '_TZE204_ikvncluo',
      '_TZE204_no6qtgtl',
    ],
    battery: false,
    noTemperature: true,
    noHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },
       2: { cap: null, setting: 'sensitivity', min: 0, max: 9 },
       3: { cap: null, setting: 'near_distance', min: 0, max: 10 },
       4: { cap: null, setting: 'far_distance', min: 0, max: 10 },
       9: { cap: 'measure_luminance.distance', smartDivisor: true },
       12: { cap: 'measure_luminance', type: 'lux_direct' },
       101: { cap: null, setting: 'static_sensitivity', min: 0, max: 10 },
       102: { cap: null, setting: 'motion_sensitivity', min: 0, max: 10 },
    }
  },

  // TYPE A2: Mains-powered mmWave radars (230V ceiling/wall)
  // These devices report battery DPs but are actually mains-powered.
  // Battery capability and polling must be suppressed.
  'MAINS_POWERED_RADAR': {
    configName: 'MAINS_POWERED_RADAR',
    sensors: [
      '_TZE204_clrdrnya', '_TZE200_clrdrnya',
      '_TZE204_lyetpprm', '_TZE200_lyetpprm',
      '_TZE204_wukb7rhc', '_TZE200_wukb7rhc',
      '_TZE204_jva8ink8', '_TZE200_jva8ink8',
    ],
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,
    hasIlluminance: true,
    noTemperature: true,
    noHumidity: true,
    needsPolling: false,
    suppressBatteryCapability: true,
    disableBatteryReporting: true,
    invertPresence: false,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },
      2: { cap: null, setting: 'sensitivity', min: 0, max: 9 },
      3: { cap: null, setting: 'near_distance', min: 0, max: 10 },
      4: { cap: null, setting: 'far_distance', min: 0, max: 10 },
      9: { cap: 'measure_luminance.distance', smartDivisor: true },
      12: { cap: 'measure_luminance', type: 'lux_direct' },
      101: { cap: null, setting: 'static_sensitivity', min: 0, max: 10 },
      102: { cap: null, setting: 'motion_sensitivity', min: 0, max: 10 },
    }
  },

  // TYPE B: 24GHz Ceiling Radar (gkfbdvyx variants)
  'ZY_M100_CEILING_24G': {
    configName: 'ZY_M100_CEILING_24G',
    sensors: [
      '_TZE200_gkfbdvyx', '_TZE204_gkfbdvyx',
      '_TZE204_laokfqwu',
    ],
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,
    hasIlluminance: true,
    noTemperature: true,
    noHumidity: true,
    needsPolling: false,
    ultraAggressiveDebounce: true,
    disableBatteryReporting: true,
    suppressBatteryCapability: true,
    invertPresence: false,
    presenceEnumMapping: { 0: false, 1: true, 2: true },
    motionThrottleEnabled: true,
    motionThrottleMs: 10000,
    motionDebounceMs: 5000,
    ignoreMovementState: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum_gkfbdvyx', enumMap: { 0: false, 1: true, 2: true } },
      2: { cap: null, internal: 'move_sensitivity' },
      3: { cap: null, internal: 'detection_distance_min', divisor: 100 },
      4: { cap: null, internal: 'detection_distance_max', divisor: 100 },
      9: { cap: 'measure_luminance.distance', smartDivisor: true },
      101: { cap: null, internal: 'distance_tracking' },
      102: { cap: null, internal: 'presence_sensitivity' },
      103: { cap: 'measure_luminance', type: 'lux_direct' },
      104: { cap: 'alarm_motion', type: 'presence_enum_gkfbdvyx', enumMap: { 0: false, 1: true, 2: true } },
      105: { cap: null, internal: 'fading_time' },
    }
  },

  // TYPE B2: ZG-204ZV MULTISENSOR
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
    noTemperature: false,
    noHumidity: false,
    luxSmoothingEnabled: true,
    luxMinChangePercent: 15,
    motionThrottleEnabled: true,
    motionThrottleMs: 5000,
    motionDebounceMs: 3000,
    noIasMotion: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      3: { cap: 'measure_temperature', smartDivisor: true },
      4: { cap: 'measure_humidity', multiplier: 10 },
      9: { cap: 'measure_luminance', type: 'lux_direct' },
      10: { cap: 'measure_battery', divisor: 1 },
      17: { cap: 'alarm_generic', type: 'bool', flowTrigger: 'sos_pressed' },
      18: { cap: 'alarm_generic', type: 'bool', flowTrigger: 'sos_pressed' },
      101: { cap: 'measure_humidity', divisor: 1 },
      106: { cap: 'measure_luminance', type: 'lux_direct' },
      110: { cap: 'measure_battery', divisor: 1 },
      111: { cap: 'measure_temperature', smartDivisor: true },
      2: { cap: null, setting: 'fading_time', min: 0, max: 28800 },
      11: { cap: null, setting: 'motion_detection_sensitivity', min: 0, max: 19 },
      102: { cap: null, setting: 'illuminance_interval', min: 1, max: 720 },
      103: { cap: null, setting: 'temperature_unit' },
      104: { cap: null, setting: 'temperature_calibration', min: -20, max: 20 },
      105: { cap: null, setting: 'humidity_calibration', min: -30, max: 30 },
      107: { cap: null, setting: 'indicator' },
      113: { cap: null, internal: 'radar_scene' },
      119: { cap: null, internal: 'radar_breathing' },
      122: { cap: null, internal: 'radar_energy' },
      123: { cap: null, internal: 'radar_static_energy' },
      124: { cap: null, internal: 'radar_self_test' },
    }
  },

  // TYPE D: TZE284_IADRO9BF (Low DP)
  'TZE284_IADRO9BF': {
    configName: 'TZE284_IADRO9BF',
    sensors: [
      '_TZE284_iadro9bf', '_TZE204_iadro9bf',
      '_TZE204_qasjif9e', '_TZE284_qasjif9e',
      '_TZE204_ztqnh5cg', '_TZE284_ztqnh5cg',
      '_TZE204_sbyx0lm6', '_TZE284_sbyx0lm6',
      '_TZE284_debczeci',
      '_TZE284_4qznlkbu', '_TZE284_ar5przmw', '_TZE284_o9ofysmo',
      '_TZE284_rlytpmij', '_TZE284_xc3vwx5a', '_TZE284_pzm3wab5',
      '_TZE284_twybxdzl', '_TZE284_hgeqeyuv', '_TZE284_vceqncho',
      '_TZE284_who1jxwd', '_TZE284_9ovska9w', '_TZE284_bquwrqh1',
      '_TZE284_gw05grph', '_TZE284_chcnj5st',
      '_TZE200_qasjif9e',
      '_TZE200_ya4ft0w4', '_TZE204_ya4ft0w4',
      '_TZE200_sgfmfpiy', '_TZE204_sgfmfpiy',
      '_TZE200_ikvncluo', '_TZE200_nbkshs6k', '_TZE204_nbkshs6k',
      '_TZE204_bvfld3xc', '_TZE204_sbkgeilo',
      '_TZE200_f1pvdgoh', '_TZE200_hyhl5y36',
      '_TZE204_b8vxct9l', '_TZE204_hyt4iucb',
      '_TZE200_juzago6i', '_TZ3218_ewrxirng',
    ],
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,
    hasIlluminance: true,
    noTemperature: true,
    noHumidity: true,
    needsPolling: false,
    invertPresence: false,
    useIntelligentInference: true,
    useDistanceInference: true,
    useAggressivePolling: false,
    ultraAggressiveLuxSmoothing: true,
    luxSmoothingWindowMs: 120000,
    luxOscillationLock: true,
    ultraAggressiveDebounce: true,
    firmwareQuirks: {
      74: { presenceWorking: true, inferenceWeight: 0.2 },
      78: { presenceWorking: false, inferenceWeight: 1.0 },
    },
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool', useInference: true, unreliable: true },
      2: { cap: null, setting: 'radar_sensitivity', min: 0, max: 9 },
      3: { cap: null, setting: 'min_range', divisor: 100, min: 0, max: 950 },
      4: { cap: null, setting: 'max_range', divisor: 100, feedInference: true, min: 0, max: 950 },
      6: { cap: null, internal: 'self_test' },
      9: { cap: 'measure_luminance.distance', smartDivisor: true, feedInference: true, primaryInference: true },
      12: { cap: 'measure_luminance', type: 'lux_direct', ultraSmooth: true },
      101: { cap: null, setting: 'detection_delay', divisor: 10, min: 0, max: 100 },
      102: { cap: null, setting: 'fading_time', divisor: 10, min: 5, max: 15000 },
      104: { cap: 'alarm_motion', type: 'presence_enum', enumMap: { 0: false, 1: true, 2: true } },
    }
  },

  // TYPE G: HOBEIAN_ZG204ZM (Hybrid)
  'HOBEIAN_ZG204ZM': {
    sensors: ['HOBEIAN'],
    modelId: 'ZG-204ZM',
    battery: true,
    useZcl: true,
    useIasZone: true,
    useTuyaDP: true,
    hasIlluminance: true,
    noTemperature: true,
    noHumidity: true,
    noIasMotion: true,
    writableDPs: [2, 3, 4, 102, 103, 104, 105, 107, 108, 109, 110, 111, 122, 123],
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      101: { cap: 'alarm_motion', type: 'motion_state_enum', enumMap: { 0: false, 1: true, 2: true, 3: true } },
      106: { cap: 'measure_luminance', type: 'lux_direct' },
      121: { cap: 'measure_battery', divisor: 1 },
      2: { cap: null, setting: 'large_motion_sensitivity', min: 0, max: 10 },
      3: { cap: 'measure_luminance.distance', smartDivisor: true },
      4: { cap: null, setting: 'large_motion_distance', divisor: 100, min: 0, max: 10 },
      102: { cap: null, setting: 'fading_time', min: 0, max: 28800 },
      104: { cap: null, setting: 'static_detection_distance', divisor: 100, min: 0, max: 6 },
      105: { cap: null, setting: 'static_detection_sensitivity', min: 0, max: 10 },
      107: { cap: null, setting: 'indicator' },
      108: { cap: null, setting: 'small_detection_distance', divisor: 100, min: 0, max: 6 },
      109: { cap: null, setting: 'small_detection_sensitivity', min: 0, max: 10 },
      103: { cap: null, setting: 'motion_false_detection' },
      110: { cap: null, setting: 'micro_minimum_distance', divisor: 100 },
      111: { cap: null, setting: 'motionless_minimum_distance', divisor: 100 },
      112: { cap: null, internal: 'reset_setting' },
      113: { cap: null, setting: 'breathe_false_detection' },
      122: { cap: null, setting: 'motion_detection_mode' },
      123: { cap: null, setting: 'motion_detection_sensitivity', min: 0, max: 10 },
    }
  },

  // TYPE H: KA8L86IU Battery Presence Sensor (haadeess #374/#382/#399/#406)
  'KA8L86IU_BATTERY': {
    configName: 'KA8L86IU_BATTERY',
    sensors: [
      '_TZE200_ka8l86iu', '_tze200_ka8l86iu', '_TZE200_KA8L86IU',
      '_TZE200_zbfmvj13', '_tze200_zbfmvj13', '_TZE200_ZBFMVJ13',
    ],
    battery: true,
    hasIlluminance: true,
    noTemperature: true,
    noHumidity: true,
    needsPolling: true,
    invertPresence: false,
    presenceEnumMapping: { 0: true, 1: false },
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum', enumMap: { 0: true, 1: false } },
      106: { cap: 'measure_luminance', type: 'lux_direct' },
      110: { cap: 'measure_battery', divisor: 1 },
    }
  },

  // DEFAULT fallback
  'DEFAULT': {
    sensors: [],
    configName: 'DEFAULT',
    battery: false,
    hasIlluminance: true,
    needsPolling: true,
    noTemperature: true,
    noHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },
      9: { cap: 'measure_luminance.distance', smartDivisor: true },
      12: { cap: 'measure_luminance', type: 'lux_direct' },
      104: { cap: 'measure_luminance', type: 'lux_direct' },
      105: { cap: 'alarm_motion', type: 'presence_enum' },
      109: { cap: 'measure_luminance.distance', smartDivisor: true },
      112: { cap: 'alarm_motion', type: 'presence_bool' },
      119: { cap: 'alarm_motion', type: 'presence_bool' },
    }
  },
};

const MANUFACTURER_CONFIG_MAP = {};
for (const [configName, config] of Object.entries(SENSOR_CONFIGS)) {
  for (const mfr of config.sensors || []) {
    MANUFACTURER_CONFIG_MAP[normalize(mfr)] = { ...config, configName };
  }
}

function getSensorConfig(manufacturerName, modelId = null) {
  if (containsCI(manufacturerName, 'HOBEIAN')) {
    const validModelId = modelId && modelId !== 'null' && modelId.trim() !== '';
    if (validModelId) {
      const model = modelId.toUpperCase();
      if (model.includes('ZG-204ZM')) {return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZM, configName: 'HOBEIAN_ZG204ZM' };}
      if (model.includes('ZG-204ZV')) {return { ...SENSOR_CONFIGS.ZG_204ZV_MULTISENSOR, configName: 'ZG_204ZV_MULTISENSOR' };}
    }
    return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZM, configName: 'HOBEIAN_ZG204ZM_FALLBACK' };
  }

  const mfrKey = normalize(manufacturerName);
  if (MANUFACTURER_CONFIG_MAP[mfrKey]) {return MANUFACTURER_CONFIG_MAP[mfrKey];}

  if (manufacturerName) {
    if (containsCI(manufacturerName, 'iadro9bf') || containsCI(manufacturerName, 'qasjif9e')) {
      return { ...SENSOR_CONFIGS.TZE284_IADRO9BF, configName: 'TZE284_IADRO9BF' };
    }
  }

  return SENSOR_CONFIGS.DEFAULT;
}

function transformPresence(value, type, invertPresence, configName) {
  if (type === 'presence_bool') {
    return invertPresence ? !value : !!value;
  }
  if (type === 'presence_enum') {
    const bool = value === 1 || value === true;
    return invertPresence ? !bool : bool;
  }
  if (type === 'motion_state_enum') {
    return value === 1 || value === 2 || value === 3;
  }
  return !!value;
}

module.exports = {
  SENSOR_CONFIGS,
  getSensorConfig,
  transformPresence,
  normalize,
  containsCI
};
