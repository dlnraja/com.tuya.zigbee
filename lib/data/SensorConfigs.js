'use strict';

/**
 * SENSOR_CONFIGS - v5.5.929
 * Centralized database of Tuya DP mappings for various presence sensors
 */
const SENSOR_CONFIGS = {
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
      '_TZE204_r0jdjrvi', '_TZE204_sfiy5tfs', 
      '_TZE204_wukb7rhc', '_TZE204_iaeejhvf',
      '_TZE204_ikvncluo', '_TZE204_jva8ink8',
      '_TZE204_lyetpprm', '_TZE204_no6qtgtl',
    ],
    battery: false,
    noTemperature: true,
    noHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },
      2: { cap: 'sensitivity', internal: 'sensitivity' },
      3: { cap: 'near_distance', internal: 'near_distance' },
      4: { cap: 'far_distance', internal: 'far_distance' },
      9: { cap: 'measure_luminance.distance', divisor: 100 },
      12: { cap: 'measure_luminance', type: 'lux_direct' },
      101: { cap: 'static_sensitivity', internal: 'static_sensitivity' },
      102: { cap: 'motion_sensitivity', internal: 'motion_sensitivity' },
    }
  },
  'ZY_M100_CEILING_24G': {
    sensors: ['_TZE200_gkfbdvyx', '_TZE204_gkfbdvyx'],
    battery: false,
    mainsPowered: true,
    hasIlluminance: true,
    noTemperature: true,
    noHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum_gkfbdvyx', enumMap: { 0: false, 1: true, 2: true } },
      2: { cap: 'move_sensitivity', internal: 'move_sensitivity' },
      3: { cap: 'detection_distance_min', internal: 'detection_distance_min', divisor: 100 },
      4: { cap: 'detection_distance_max', internal: 'detection_distance_max', divisor: 100 },
      9: { cap: 'measure_luminance.distance', divisor: 100 },
      101: { cap: 'distance_tracking', internal: 'distance_tracking' },
      102: { cap: 'presence_sensitivity', internal: 'presence_sensitivity' },
      103: { cap: 'measure_luminance', type: 'lux_direct' },
      104: { cap: 'alarm_motion', type: 'presence_enum_gkfbdvyx', enumMap: { 0: false, 1: true, 2: true } },
      105: { cap: 'fading_time', internal: 'fading_time' },
    }
  },
  'ZG_204ZV_MULTISENSOR': {
    sensors: [
      '_TZE200_grgol3xp', '_TZE204_grgol3xp',
      '_TZE200_uli8wasj', '_TZE204_uli8wasj',
      'HOBEIAN', '_TZ3000_8bxrzyxz', '_TZ3000_8BXRZYXZ',
      '_TZE200_y8jijhba',
      '_TZE200_gnpn9hxb',
      '_TZE200_rxqls8v0', '_TZE204_rxqls8v0', // Added from MotionSensorDevice
      '_TZE200_3towulqd', '_TZE204_3towulqd', // Permissive variant
    ],
    battery: true,
    hasIlluminance: true,
    isPermissive: true, // Allow dynamic capability addition
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      3: { cap: 'measure_temperature', divisor: 10 },
      4: { cap: 'measure_humidity', multiplier: 10 },
      9: { cap: 'measure_luminance', type: 'lux_direct' },
      10: { cap: 'measure_battery', divisor: 1 },
      12: { cap: 'measure_battery', divisor: 1 },
      17: { cap: 'alarm_generic', type: 'bool', flowTrigger: 'sos_pressed' },
      18: { cap: 'alarm_generic', type: 'bool', flowTrigger: 'sos_pressed' },
      101: { cap: 'measure_humidity', divisor: 1 },
      106: { cap: 'measure_luminance', type: 'lux_direct' },
      110: { cap: 'measure_battery', divisor: 1 },
    }
  },
  'HOBEIAN_ZG204ZM': {
    sensors: [
      '_TZE200_2aaelwxk', '_TZE204_2aaelwxk', 
      '_TZE200_kb5noeto', '_TZE204_kb5noeto', 
      '_TZE200_rhgsbacq', '_TZE200_5b5noeto',
      '_TZE200_ttcovulf', '_TZE200_sgpeacqp'
    ],
    battery: false,
    mainsPowered: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },
      2: { cap: 'sensitivity', internal: 'sensitivity' },
      3: { cap: 'near_distance', internal: 'near_distance', divisor: 100 },
      4: { cap: 'far_distance', internal: 'far_distance', divisor: 100 },
      9: { cap: 'measure_luminance.distance', divisor: 100 },
      12: { cap: 'measure_luminance', type: 'lux_direct' },
      101: { cap: 'static_sensitivity', internal: 'static_sensitivity' },
      102: { cap: 'motion_sensitivity', internal: 'motion_sensitivity' },
      104: { cap: 'fading_time', internal: 'fading_time' },
      105: { cap: 'detection_delay', internal: 'detection_delay' },
    }
  },
  'HOBEIAN_10G_MULTI': {
    sensors: ['_TZE200_7hfcudw5', '_TZE200_myd45weu', '_TZE200_nlrfgpny', 'ZG-227Z', 'ZB003-X'],
    battery: false,
    mainsPowered: true,
    hasIlluminance: true,
    hasTemperature: true,
    hasHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },
      3: { cap: 'measure_temperature', divisor: 10 },
      4: { cap: 'measure_humidity', multiplier: 1 },
      5: { cap: 'measure_temperature', divisor: 10 },
      6: { cap: 'measure_humidity', divisor: 1 },
      12: { cap: 'measure_luminance', type: 'lux_direct' },
      102: { cap: 'measure_luminance', type: 'lux_direct' },
    }
  },
  'ZG_204ZL_PIR': {
    sensors: [
      '_TZE200_3towulqd', '_TZE204_3towulqd', 
      '_TZE200_1ibpyhdc', '_TZE204_1ibpyhdc', 
      '_TZE200_bh3n6gk8', '_TZE200_sgpeacqp'
    ],
    battery: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      4: { cap: 'measure_battery', divisor: 1 },
      9: { cap: 'sensitivity', internal: 'sensitivity' },
      10: { cap: 'keep_time', internal: 'keep_time' },
      12: { cap: 'measure_luminance', type: 'lux_direct' },
    }
  },
  'TZE200_CRQ3R3LA': {
    sensors: ['_TZE200_crq3r3la', '_TZE204_crq3r3la'],
    battery: false,
    mainsPowered: true,
    noTemperature: true,
    noHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum_gkfbdvyx', enumMap: { 0: false, 1: true, 2: true } },
      2: { cap: 'move_sensitivity', internal: 'move_sensitivity' },
      3: { cap: 'detection_distance_min', internal: 'detection_distance_min', divisor: 100 },
      4: { cap: 'detection_distance_max', internal: 'detection_distance_max', divisor: 100 },
      9: { cap: 'measure_luminance.distance', divisor: 100 },
      101: { cap: 'distance_tracking', internal: 'distance_tracking' },
      102: { cap: 'presence_sensitivity', internal: 'presence_sensitivity' },
      103: { cap: 'measure_luminance', type: 'lux_direct' },
      104: { cap: 'alarm_motion', type: 'presence_enum_gkfbdvyx', enumMap: { 0: false, 1: true, 2: true } },
      105: { cap: 'fading_time', internal: 'fading_time' },
    }
  },
  'TZE284_IADRO9BF': {
    sensors: [
      '_TZE284_iadro9bf', '_TZE204_iadro9bf',
      '_TZE204_ztqnh5cg', '_TZE204_sbyx0lm6',
      '_TZE204_qasjif9e', '_TZE284_qasjif9e',
      '_TZE204_clrdrnya', '_TZE200_clrdrnya', // RELAY variants
      '_TZE204_pfayrzcw', '_TZE284_4qznlkbu'
    ],
    battery: false,
    mainsPowered: true,
    hasIlluminance: true,
    noTemperature: true,
    noHumidity: true,
    invertPresence: true,
    useIntelligentInference: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      2: { cap: 'sensitivity', internal: 'sensitivity' },
      101: { cap: 'presence_keep_time', internal: 'presence_keep_time' },
      102: { cap: 'measure_luminance', type: 'lux_direct' },
      104: { cap: 'measure_luminance.distance', divisor: 100 },
      108: { cap: 'onoff', type: 'bool' }, // For RELAY models
    }
  },
  'IMMAX_MULTISENSOR': {
    sensors: ['_TZE200_ppuj1vem', 'Immax'],
    battery: true,
    hasTemperature: true,
    hasHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      4: { cap: 'measure_battery', divisor: 1 },
      5: { cap: 'measure_temperature', divisor: 10 },
      6: { cap: 'measure_humidity', divisor: 1 },
    }
  },
  'DEFAULT': {
    sensors: [],
    dpMap: {}
  }
};

module.exports = SENSOR_CONFIGS;

