'use strict';

/**
 * Light Device Profiles - v5.8.80
 * Covers: TS0501-TS0505 dimmers/bulbs, TS0601 LED strips
 */

const LIGHT_PROFILES = [

  // TS0502 CCT Light (color temperature)
  {
    id: 'ts0502_cct_light',
    productId: 'TS0502',
    deviceType: 'light',
    protocol: 'zcl',
    endpoints: [1],
    clusters: {
      1: {
        onOff: { bind: true, report: ['onOff'] },
        levelControl: { bind: true, report: ['currentLevel'] },
        colorControl: { bind: true, report: ['colorTemperatureMireds'] }
      }
    },
    capabilities: ['onoff', 'dim', 'light_temperature'],
    quirks: {},
    timing: {}
  },

  // TS0504/TS0505 RGB/RGBW Light
  {
    id: 'ts0505_rgb_light',
    productId: ['TS0504', 'TS0505'],
    deviceType: 'light',
    protocol: 'zcl',
    endpoints: [1],
    clusters: {
      1: {
        onOff: { bind: true, report: ['onOff'] },
        levelControl: { bind: true, report: ['currentLevel'] },
        colorControl: { bind: true, report: ['currentHue', 'currentSaturation', 'colorTemperatureMireds'] }
      }
    },
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode'],
    quirks: {},
    timing: {}
  },

  // TS0501 Dimmable Light
  {
    id: 'ts0501_dimmer',
    productId: 'TS0501',
    deviceType: 'light',
    protocol: 'zcl',
    endpoints: [1],
    clusters: {
      1: {
        onOff: { bind: true, report: ['onOff'] },
        levelControl: { bind: true, report: ['currentLevel'] }
      }
    },
    capabilities: ['onoff', 'dim'],
    quirks: {},
    timing: {}
  },

  // TS0601 Tuya DP LED Strip
  {
    id: 'ts0601_led_strip',
    productId: 'TS0601',
    manufacturerName: [
      '_TZE200_s8gkrkxk', '_TZE200_7bkbsjmr', '_TZE200_kq0sfkcw',
      '_TZE204_s8gkrkxk'
    ],
    deviceType: 'light',
    protocol: 'tuya_dp',
    dpMappings: {
      20: { capability: 'onoff', type: 'bool' },
      21: { capability: 'light_mode', setting: 'mode', type: 'enum' },
      22: { capability: 'dim', type: 'value', divisor: 10, min: 10, max: 1000 },
      23: { capability: 'light_temperature', type: 'value', divisor: 1000, min: 0, max: 1000 },
      24: { capability: 'light_hue', setting: 'color_hsv', type: 'string' },
      25: { capability: 'effect', setting: 'scene_data', type: 'string' }
    },
    capabilities: ['onoff', 'dim', 'light_temperature'],
    quirks: {},
    timing: {}
  },

  // TS0601 Tuya DP Dimmer (wall dimmer)
  {
    id: 'ts0601_wall_dimmer',
    productId: 'TS0601',
    manufacturerName: [
      '_TZE200_dfxkcots', '_TZE200_w4cryh2i', '_TZE200_ip2akl9w',
      '_TZE204_dfxkcots'
    ],
    deviceType: 'light',
    protocol: 'tuya_dp',
    dpMappings: {
      1: { capability: 'onoff', type: 'bool' },
      2: { capability: 'dim', type: 'value', divisor: 10, min: 10, max: 1000 },
      3: { setting: 'min_brightness', type: 'value' },
      5: { setting: 'max_brightness', type: 'value' },
      7: { setting: 'led_type', type: 'enum' }
    },
    capabilities: ['onoff', 'dim'],
    quirks: {},
    timing: {}
  },

  // ZCL dimmer modules (TS0052, TS110E, TS110F)
  {
    id: 'zcl_dimmer_module',
    productId: ['TS0052', 'TS110E', 'TS110F'],
    deviceType: 'light',
    protocol: 'zcl',
    endpoints: [1],
    clusters: {
      1: {
        onOff: { bind: true, report: ['onOff'] },
        levelControl: { bind: true, report: ['currentLevel'] }
      }
    },
    capabilities: ['onoff', 'dim'],
    quirks: {},
    timing: {}
  },

  // Default light
  {
    id: 'light_default',
    deviceType: 'light',
    isDefault: true,
    protocol: 'zcl',
    clusters: {
      1: {
        onOff: { bind: true, report: ['onOff'] },
        levelControl: { bind: true, report: ['currentLevel'] }
      }
    },
    capabilities: ['onoff', 'dim'],
    quirks: {},
    timing: {}
  }
];

module.exports = LIGHT_PROFILES;
