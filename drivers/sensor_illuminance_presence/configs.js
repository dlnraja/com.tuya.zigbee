'use strict';

const { containsCI, normalize } = require('../../lib/utils/CaseInsensitiveMatcher');

// ═══════════════════════════════════════════════════════════════════════════════
// v5.5.793: VALIDATION CONSTANTS - Centralized thresholds for data validation
// ═══════════════════════════════════════════════════════════════════════════════
const VALIDATION = {
  BATTERY_MIN: 0,
  BATTERY_MAX: 100,
  LUX_MIN: 0,
  LUX_MAX: 10000,
  LUX_ZYM100_MAX: 2000,     // ZY-M100 series confirmed 0-2000 lux range
  DISTANCE_MIN: 0,
  DISTANCE_MAX: 10,          // Most radar sensors have 0-10m range
};

// ═══════════════════════════════════════════════════════════════════════════════
// SENSOR CONFIGURATIONS - Massive radar/presence database
// ═══════════════════════════════════════════════════════════════════════════════
const SENSOR_CONFIGS = {
  'ZG_204ZV_MULTISENSOR': {
    sensors: [
      '_TZE200_ef5m00u2', '_TZE204_ef5m00u2',
      '_TZE200_f18u9bm9', '_TZE204_f18u9bm9',
      '_TZE200_ikp3o1as', '_TZE204_ikp3o1as',
      '_TZE200_v6ossqfy',
      '_TZE200_8bxrzyxz', '_TZ3000_8bxrzyxz',
      '_TZE200_ebv75p3u', '_TZE204_ebv75p3u',
      'HOBEIAN_ZG204ZV'
    ],
    battery: true,
    hasIlluminance: true,
    hasTemperature: true,
    hasHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      3: { cap: 'measure_temperature', smartDivisor: true },
      4: { cap: 'measure_humidity', divisor: 1 },
      9: { cap: 'measure_luminance', type: 'lux_direct' },
      10: { cap: 'measure_battery', divisor: 1 },
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
    }
  },

  'ZY_M100_SIMPLE': {
    sensors: [
      '_TZE200_0u3bj3rc', '_TZE200_mx6u6l4y', '_TZE200_v6ossqfy',
      '_TZE200_1ibpyhdc', '_TZE204_1ibpyhdc', '_TZE200_auin8mzr', '_TZE204_auin8mzr',
    ],
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,
    hasIlluminance: false,
    noTemperature: true,
    noHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      101: { cap: null, internal: 'duration_of_attendance' },
      102: { cap: null, internal: 'duration_of_absence' },
      103: { cap: null, internal: 'led_state' },
    }
  },

  'ZG_204ZM_BATTERY': {
    sensors: ['_TZE200_y8jijhba', '_TZE204_y8jijhba'],
    battery: true,
    noTemperature: true,
    noHumidity: true,
    suppressBatteryWarnings: true,
    batteryThrottleMs: 3600000,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      4: { cap: 'measure_battery', divisor: 1 },
      9: { cap: 'measure_luminance', divisor: 1 },
    }
  },

  'ZG_204ZL_PIR': {
    sensors: [
      '_TZE200_3towulqd', '_TZE204_3towulqd', '_tze200_3towulqd',
      '_TZE200_bh3n6gk8', '_TZE200_ppuj1vem',
    ],
    battery: true,
    hasIlluminance: true,
    noTemperature: true,
    noHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      4: { cap: 'measure_battery', divisor: 1 },
      9: { cap: null, setting: 'sensitivity' },
      10: { cap: null, setting: 'keep_time' },
      12: { cap: 'measure_luminance', type: 'lux_direct' },
      102: { cap: null, setting: 'illuminance_interval', min: 1, max: 720 },
    }
  },

  'MTG075_ZB_RL_RELAY': {
    configName: 'MTG075_ZB_RL_RELAY',
    sensors: [
      '_TZE204_sbyx0lm6', '_TZE204_clrdrnya',
      '_TZE204_dtzziy1e', '_TZE204_iaeejhvf',
      '_TZE204_mtoaryre', '_TZE200_mp902om5',
      '_TZE204_pfayrzcw', '_TZE284_4qznlkbu',
      '_TZE200_clrdrnya', '_TZE200_sbyx0lm6',
    ],
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,
    hasIlluminance: true,
    hasRelay: true,
    relayDp: 108,
    relayType: 'enum',
    noTemperature: true,
    noHumidity: true,
    needsPolling: false,
    suppressBatteryCapability: true,
    disableBatteryReporting: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      2: { cap: null, setting: 'radar_sensitivity', min: 0, max: 9 },
      3: { cap: null, setting: 'shield_range', divisor: 100, min: 0, max: 8 },
      4: { cap: null, setting: 'detection_range', divisor: 100, min: 0, max: 8 },
      6: { cap: null, internal: 'equipment_status' },
      9: { cap: 'measure_luminance.distance', divisor: 100 },
      101: { cap: null, setting: 'entry_filter_time', divisor: 10, min: 0, max: 10 },
      102: { cap: null, setting: 'departure_delay', min: 0, max: 3600 },
      104: { cap: 'measure_luminance', divisor: 10 },
      105: { cap: null, setting: 'entry_sensitivity', min: 0, max: 9 },
      106: { cap: null, setting: 'entry_distance_indentation', divisor: 100, min: 0, max: 8 },
      107: { cap: null, setting: 'breaker_mode', type: 'enum', enumMap: { 0: 'standard', 1: 'local' }, reverseEnumMap: { standard: 0, local: 1 } },
      108: { cap: 'onoff', type: 'enum_onoff', enumMap: { 0: false, 1: true }, writable: true },
      109: { cap: null, setting: 'status_indication', type: 'enum', enumMap: { 0: false, 1: true }, reverseEnumMap: { false: 0, true: 1, off: 0, on: 1 } },
      110: { cap: null, setting: 'illuminance_threshold', divisor: 10, min: 0, max: 420 },
      111: { cap: null, setting: 'breaker_polarity', type: 'enum', enumMap: { 0: 'NC', 1: 'NO' }, reverseEnumMap: { NC: 0, NO: 1, nc: 0, no: 1 } },
      112: { cap: null, setting: 'block_time', divisor: 10, min: 0, max: 10 },
      115: { cap: null, setting: 'sensor_mode', type: 'enum', enumMap: { 0: 'on', 1: 'off', 2: 'occupied', 3: 'unoccupied' }, reverseEnumMap: { on: 0, off: 1, occupied: 2, unoccupied: 3 } },
    }
  },

  'TZE284_IADRO9BF': {
    configName: 'TZE284_IADRO9BF',
    sensors: [
      '_TZE284_iadro9bf', '_TZE204_iadro9bf', '_TZE204_qasjif9e', '_TZE284_qasjif9e',
      '_TZE204_ztqnh5cg', '_TZE284_ztqnh5cg', '_TZE284_sbyx0lm6',
      '_TZE284_debczeci', '_TZE284_ar5przmw', '_TZE284_o9ofysmo',
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
    noBatteryCapability: true,
    hasIlluminance: true,
    noTemperature: true,
    noHumidity: true,
    useIntelligentInference: true,
    useDistanceInference: true,
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

  'TZE284_SERIES_HIGH_DP': {
    sensors: [
      '_TZE284_n5q2t8na', '_TZE284_ztc6ggyl', '_TZE284_ijxvkhd0', '_TZE284_sxm7l9xa',
      '_TZE284_xsm7l9xa', '_TZE284_yrwmnya3', '_TZE204_ijxvkhd0', '_TZE204_e5m9c5hl',
      '_TZE204_kyhbrfyl', '_TZE204_ex3rcdha', '_TZE200_ztc6ggyl', '_TZE204_ztc6ggyl',
      '_TZE204_sxm7l9xa',
    ],
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,
    hasIlluminance: true,
    needsPolling: true,
    noTemperature: true,
    noHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum', fallback: true },
      104: { cap: 'measure_luminance', type: 'lux_direct' },
      105: { cap: 'alarm_motion', type: 'presence_enum' },
      106: { cap: null, setting: 'radar_sensitivity', min: 1, max: 9 },
      107: { cap: null, setting: 'max_range', divisor: 100, min: 0, max: 1000 },
      108: { cap: null, setting: 'min_range', divisor: 100, min: 0, max: 1000 },
      109: { cap: 'measure_luminance.distance', smartDivisor: true },
      110: { cap: null, setting: 'fading_time', divisor: 10, min: 50, max: 15000 },
      111: { cap: null, setting: 'detection_delay', divisor: 10, min: 0, max: 100 },
      112: { cap: 'alarm_motion', type: 'presence_bool' },
    }
  },

  'ZY_M100_S1_SIDEALL': {
    sensors: [],
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,
    hasIlluminance: true,
    needsPolling: true,
    noTemperature: true,
    noHumidity: true,
    dpMap: {
      104: { cap: 'measure_luminance', type: 'lux_direct' },
      105: { cap: 'alarm_motion', type: 'presence_bool' },
      106: { cap: null, setting: 'radar_sensitivity', min: 1, max: 9 },
      107: { cap: null, setting: 'max_range', divisor: 100, min: 0, max: 1000 },
      108: { cap: null, setting: 'min_range', divisor: 100, min: 0, max: 1000 },
      109: { cap: 'measure_luminance.distance', smartDivisor: true },
      110: { cap: null, setting: 'fading_time', divisor: 10, min: 50, max: 15000 },
      111: { cap: null, setting: 'detection_delay', divisor: 10, min: 0, max: 100 },
    }
  },

  'FALL_DETECTION': {
    sensors: ['_TZE200_7gclukjs', '_TZE204_7gclukjs'],
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,
    noTemperature: true,
    noHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },
      2: { cap: null, internal: 'sensitivity' },
      101: { cap: 'measure_luminance.distance', smartDivisor: true },
      102: { cap: 'measure_luminance', divisor: 1 },
      112: { cap: 'alarm_motion', type: 'presence_enum' },
    }
  },

  'ILLUMINANCE_FOCUS': {
    sensors: ['_TZE200_laokfqwu', '_TZE200_ztqnh5cg', '_tze200_y4mdop0b'],
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,
    noTemperature: true,
    noHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      6: { cap: null, internal: 'fading_time' },
      9: { cap: 'measure_luminance', divisor: 1 },
      101: { cap: 'measure_luminance.distance', smartDivisor: true },
    }
  },

  'WZ_M100': {
    sensors: ['_TZE204_laokfqwu'],
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,
    noTemperature: true,
    noHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      2: { cap: null, setting: 'radar_sensitivity', min: 0, max: 9 },
      3: { cap: null, setting: 'min_range', divisor: 100, min: 0, max: 950 },
      4: { cap: null, setting: 'max_range', divisor: 100, min: 0, max: 950 },
      9: { cap: 'measure_luminance.distance', smartDivisor: true },
      103: { cap: 'measure_luminance', divisor: 1 },
      104: { cap: null, setting: 'interval_time', min: 1, max: 720 },
      105: { cap: null, setting: 'detection_delay', divisor: 10, min: 0, max: 100 },
      106: { cap: null, setting: 'fading_time', divisor: 10, min: 5, max: 15000 },
    }
  },

  'Y1_IN': {
    sensors: ['_TZE204_bmdsp6bs'],
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,
    noTemperature: true,
    noHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      102: { cap: null, internal: 'fading_time' },
      103: { cap: 'measure_luminance', divisor: 1 },
      110: { cap: null, internal: 'keep_sensitivity' },
      114: { cap: null, internal: 'trigger_sensitivity' },
      182: { cap: 'measure_luminance.distance', smartDivisor: true },
    }
  },

  'ZY_M100_24G_SPAM': {
    sensors: [],
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,
    hasIlluminance: true,
    reportsFrequently: true,
    noTemperature: true,
    noHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },
      104: { cap: 'measure_luminance', type: 'lux_direct' },
      109: { cap: 'measure_luminance.distance', smartDivisor: true },
    }
  },

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

  'HOBEIAN_10G_MULTI': {
    sensors: ['_TZE200_rhgsbacq', '_TZE204_rhgsbacq', '_TZE284_ozf4e02o'],
    modelId: 'ZG-227Z',
    battery: true,
    mainsPowered: false,
    noBatteryCapability: false,
    hasIlluminance: true,
    hasTemperature: true,
    hasHumidity: true,
    noTemperature: false,
    noHumidity: false,
    noIasMotion: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      2: { cap: null, setting: 'sensitivity', min: 0, max: 10 },
      101: { cap: 'measure_humidity', smartDivisor: true },
      102: { cap: null, setting: 'fading_time', min: 0, max: 28800 },
      106: { cap: 'measure_luminance', type: 'lux_direct' },
      110: { cap: 'measure_battery', divisor: 1 },
      111: { cap: 'measure_temperature', smartDivisor: true },
      103: { cap: null, setting: 'temperature_unit' },
      104: { cap: null, setting: 'temperature_calibration', min: -20, max: 20 },
      105: { cap: null, setting: 'humidity_calibration', min: -30, max: 30 },
      4: { cap: 'measure_battery', divisor: 1 },
      9: { cap: null, setting: 'sensitivity' },
      10: { cap: null, setting: 'keep_time' },
      12: { cap: 'measure_luminance', type: 'lux_direct' },
    }
  },

  'ZCL_ONLY_RADAR': {
    sensors: ['_TZE200_kb5noeto'],
    battery: true,
    suppressBatteryWarnings: true,
    batteryThrottleMs: 3600000,
    useZcl: true,
    useIasZone: true,
    useTuyaDP: false,
    permissiveMode: true,
    hasIlluminance: true,
    noTemperature: true,
    noHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool', optional: true },
      106: { cap: 'measure_luminance', type: 'lux_direct', optional: true },
      121: { cap: 'measure_battery', divisor: 1, optional: true },
    }
  },

  'ZG_204ZM_RADAR': {
    sensors: ['_TZE200_2aaelwxk', '_TZE204_2aaelwxk', '_TZE200_tyffvoij'],
    battery: true,
    hasIlluminance: true,
    noTemperature: true,
    noHumidity: true,
    suppressBatteryWarnings: true,
    batteryThrottleMs: 3600000,
    writableDPs: [2, 3, 4, 102, 103, 104, 105, 107, 108, 109, 110, 111, 122, 123],
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      101: { cap: 'alarm_motion', type: 'motion_state_enum' },
      106: { cap: 'measure_luminance', type: 'lux_direct' },
      121: { cap: 'measure_battery', divisor: 1 },
      2: { cap: null, setting: 'large_motion_detection_sensitivity', min: 0, max: 10 },
      3: { cap: null, setting: 'mov_minimum_distance', divisor: 100 },
      4: { cap: null, setting: 'large_motion_detection_distance', divisor: 100, min: 0, max: 10 },
      102: { cap: null, setting: 'fading_time', min: 0, max: 28800 },
      103: { cap: null, setting: 'motion_false_detection' },
      104: { cap: null, setting: 'medium_motion_detection_distance', divisor: 100, min: 0, max: 6 },
      105: { cap: null, setting: 'medium_motion_detection_sensitivity', min: 0, max: 10 },
      107: { cap: null, setting: 'indicator' },
      108: { cap: null, setting: 'small_detection_distance', divisor: 100, min: 0, max: 6 },
      109: { cap: null, setting: 'small_detection_sensitivity', min: 0, max: 10 },
      110: { cap: null, setting: 'micro_minimum_distance', divisor: 100 },
      111: { cap: null, setting: 'motionless_minimum_distance', divisor: 100 },
      112: { cap: null, internal: 'reset_setting' },
      113: { cap: null, setting: 'breathe_false_detection' },
      122: { cap: null, setting: 'motion_detection_mode' },
      123: { cap: null, setting: 'motion_detection_sensitivity', min: 0, max: 10 },
    }
  },

  'TZ3000_PIR': {
    sensors: ['_TZ3000_aigddb2b', '_TZ3000_ky0fq4ho', '_TZ3210_fkzihax8'],
    battery: false,
    useZcl: true,
    useIasZone: true,
    hasIlluminance: true,
    noTemperature: true,
    noHumidity: true,
    dpMap: {
      103: { cap: 'measure_luminance', type: 'lux_direct' },
    }
  },

  'LEAPMW_5G8_RADAR': {
    sensors: ['_TZ321C_fkzihaxe8', '_TZ321C_fkzihax8', '_TZ321C_4slreunp'],
    battery: false,
    useIasZone: true,
    hasIlluminance: true,
    noTemperature: true,
    noHumidity: true,
    needsMagicPacket: true,
    dpMap: {
      107: { cap: 'measure_luminance', smartDivisor: true, type: 'lux_direct' },
      109: { cap: 'measure_luminance.distance', smartDivisor: true },
      119: { cap: 'measure_luminance.distance', smartDivisor: true },
      101: { cap: null, setting: 'entry_sensitivity', min: 10, max: 100 },
      102: { cap: null, setting: 'entry_distance', divisor: 100, min: 0, max: 10 },
      103: { cap: null, setting: 'departure_delay', min: 5, max: 7200 },
      104: { cap: null, setting: 'entry_filter_time', divisor: 100 },
      105: { cap: null, setting: 'block_time', divisor: 10 },
      108: { cap: null, setting: 'debug_mode' },
      110: { cap: null, internal: 'debug_countdown' },
      111: { cap: null, setting: 'radar_scene' },
      112: { cap: null, setting: 'sensor_mode' },
      114: { cap: null, setting: 'status_indication' },
      115: { cap: null, setting: 'radar_sensitivity', min: 10, max: 100 },
      116: { cap: null, setting: 'minimum_range', divisor: 100, min: 0, max: 10 },
      117: { cap: null, setting: 'maximum_range', divisor: 100, min: 0, max: 10 },
      120: { cap: null, setting: 'distance_report_mode' },
    }
  },

  'TZE200_CRQ3R3LA': {
    sensors: ['_TZE200_crq3r3la', '_TZE200_CRQ3R3LA'],
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,
    hasIlluminance: false,
    noTemperature: true,
    noHumidity: true,
    noIasMotion: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      101: { cap: null, setting: 'motion_state' },
      113: { cap: null, setting: 'mode' },
      119: { cap: null, setting: 'sensitivity' },
      123: { cap: null, setting: 'detection_delay' },
      124: { cap: null, setting: 'indicator' },
    }
  },

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

// Build reverse lookup: manufacturerName -> config
const MANUFACTURER_CONFIG_MAP = {};
for (const [configName, config] of Object.entries(SENSOR_CONFIGS)) {
  for (const mfr of config.sensors) {
    MANUFACTURER_CONFIG_MAP[normalize(mfr)] = { ...config, configName };
  }
}

// Get sensor config by manufacturerName and optional modelId
function getSensorConfig(manufacturerName, modelId = null) {
  if (containsCI(manufacturerName, 'HOBEIAN')) {
    const validModelId = modelId && modelId !== 'null' && modelId.trim() !== '';
    if (validModelId) {
      const model = modelId.toUpperCase();
      if (model.includes('ZG-204ZM')) {return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZM, configName: 'HOBEIAN_ZG204ZM' };}
      if (model.includes('ZG-204ZV')) {return { ...SENSOR_CONFIGS.ZG_204ZV_MULTISENSOR, configName: 'ZG_204ZV_MULTISENSOR' };}
      if (model.includes('ZG-227Z')) {return { ...SENSOR_CONFIGS.HOBEIAN_10G_MULTI, configName: 'HOBEIAN_10G_MULTI' };}
      if (model.includes('ZG-204ZL')) {return { ...SENSOR_CONFIGS.ZG_204ZL_PIR, configName: 'ZG_204ZL_PIR' };}
    }
    return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZM, configName: 'HOBEIAN_ZG204ZM_FALLBACK' };
  }

  const mfrKey = normalize(manufacturerName);
  if (MANUFACTURER_CONFIG_MAP[mfrKey]) {
    return MANUFACTURER_CONFIG_MAP[mfrKey];
  }

  if (manufacturerName) {
    if (containsCI(manufacturerName, 'iadro9bf') || containsCI(manufacturerName, 'qasjif9e') ||
      containsCI(manufacturerName, 'ztqnh5cg') || containsCI(manufacturerName, 'sbyx0lm6')) {
      return { ...SENSOR_CONFIGS.TZE284_IADRO9BF, configName: 'TZE284_IADRO9BF' };
    }
  }

  return SENSOR_CONFIGS.DEFAULT;
}

// Transform presence value based on type
function transformPresence(value, type, invertPresence = false, configName = '') {
  if (value === null || value === undefined) {return false;}

  let result;
  switch (type) {
  case 'presence_enum':
    result = value === 1 || value === 2;
    break;
  case 'presence_enum_gkfbdvyx':
    if (value === 0) {result = false;}
    else if (value === 1) {result = true;}
    else if (value === 2) {return null;}
    else {result = false;}
    break;
  case 'presence_bool':
    result = value === 1 || value === true || value === 'presence';
    break;
  case 'motion_state_enum':
    result = value === 1 || value === 2 || value === 3;
    break;
  case 'presence_string':
    result = value === 'motion' || value === 'stationary' || value === 'presence';
    break;
  default:
    result = !!value;
  }

  if (invertPresence) {return !result;}
  return result;
}

module.exports = {
  VALIDATION,
  SENSOR_CONFIGS,
  getSensorConfig,
  transformPresence,
};
