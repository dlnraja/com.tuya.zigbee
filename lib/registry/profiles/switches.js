'use strict';

/**
 * Switch Device Profiles - v5.8.80
 * Static profiles for all known switch variants
 * Covers: TS0001-TS0004, TS0011-TS0014, TS0601 switches, TS0726
 */

const SWITCH_PROFILES = [

  // ══════════════════════════════════════════════════════════════
  // PRODUCT-ID DEFAULTS (fallback when no exact mfr match)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'ts0001_default',
    productId: 'TS0001',
    deviceType: 'switch',
    isDefault: false,
    protocol: 'zcl',
    gangCount: 1,
    endpoints: [1],
    clusters: { 1: { onOff: { bind: true, report: ['onOff'] } } },
    dpMappings: { 1: { capability: 'onoff', type: 'bool' } },
    capabilities: ['onoff'],
    quirks: {},
    timing: { appCommandWindow: 500 }
  },

  {
    id: 'ts0002_default',
    productId: 'TS0002',
    deviceType: 'switch',
    protocol: 'zcl',
    gangCount: 2,
    endpoints: [1, 2],
    clusters: {
      1: { onOff: { bind: true, report: ['onOff'] } },
      2: { onOff: { bind: true, report: ['onOff'] } }
    },
    dpMappings: { 1: { capability: 'onoff', type: 'bool' }, 2: { capability: 'onoff.2', type: 'bool' } },
    capabilities: ['onoff', 'onoff.2'],
    quirks: {},
    timing: { appCommandWindow: 500 }
  },

  {
    id: 'ts0003_default',
    productId: 'TS0003',
    deviceType: 'switch',
    protocol: 'zcl',
    gangCount: 3,
    endpoints: [1, 2, 3],
    clusters: {
      1: { onOff: { bind: true, report: ['onOff'] } },
      2: { onOff: { bind: true, report: ['onOff'] } },
      3: { onOff: { bind: true, report: ['onOff'] } }
    },
    dpMappings: {
      1: { capability: 'onoff', type: 'bool' },
      2: { capability: 'onoff.2', type: 'bool' },
      3: { capability: 'onoff.3', type: 'bool' }
    },
    capabilities: ['onoff', 'onoff.2', 'onoff.3'],
    quirks: {},
    timing: { appCommandWindow: 500 }
  },

  {
    id: 'ts0004_default',
    productId: 'TS0004',
    deviceType: 'switch',
    protocol: 'zcl',
    gangCount: 4,
    endpoints: [1, 2, 3, 4],
    clusters: {
      1: { onOff: { bind: true, report: ['onOff'] } },
      2: { onOff: { bind: true, report: ['onOff'] } },
      3: { onOff: { bind: true, report: ['onOff'] } },
      4: { onOff: { bind: true, report: ['onOff'] } }
    },
    dpMappings: {
      1: { capability: 'onoff', type: 'bool' },
      2: { capability: 'onoff.2', type: 'bool' },
      3: { capability: 'onoff.3', type: 'bool' },
      4: { capability: 'onoff.4', type: 'bool' }
    },
    capabilities: ['onoff', 'onoff.2', 'onoff.3', 'onoff.4'],
    quirks: {},
    timing: { appCommandWindow: 500 }
  },

  // ══════════════════════════════════════════════════════════════
  // BSEED ZCL-ONLY SWITCHES (known problematic - PR #120)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'bseed_2gang_l9brjwau',
    manufacturerName: '_TZ3000_l9brjwau',
    productId: 'TS0002',
    deviceType: 'switch',
    protocol: 'zcl',
    gangCount: 2,
    endpoints: [1, 2],
    clusters: {
      1: { onOff: { bind: true, report: ['onOff'] }, customE000: true, customE001: true },
      2: { onOff: { bind: true, report: ['onOff'] } }
    },
    capabilities: ['onoff', 'onoff.2'],
    quirks: { zclOnly: true, hasCustomClusters: true, perEndpointControl: true },
    timing: { appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800 }
  },

  {
    id: 'bseed_2gang_blhvsaqf',
    manufacturerName: ['_TZ3000_blhvsaqf', '_TZ3000_ysdv91bk', '_TZ3000_hafsqare', '_TZ3000_e98krvvk', '_TZ3000_iedbgyxt'],
    productId: 'TS0002',
    deviceType: 'switch',
    protocol: 'zcl',
    gangCount: 2,
    endpoints: [1, 2],
    clusters: {
      1: { onOff: { bind: true, report: ['onOff'] }, customE000: true, customE001: true },
      2: { onOff: { bind: true, report: ['onOff'] } }
    },
    capabilities: ['onoff', 'onoff.2'],
    quirks: { zclOnly: true, hasCustomClusters: true, perEndpointControl: true },
    timing: { appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800 }
  },

  {
    id: 'bseed_3gang_qkixdnon',
    manufacturerName: '_TZ3000_qkixdnon',
    productId: 'TS0003',
    deviceType: 'switch',
    protocol: 'zcl',
    gangCount: 3,
    endpoints: [1, 2, 3],
    clusters: {
      1: { onOff: { bind: true, report: ['onOff'] }, customE000: true, customE001: true },
      2: { onOff: { bind: true, report: ['onOff'] } },
      3: { onOff: { bind: true, report: ['onOff'] } }
    },
    capabilities: ['onoff', 'onoff.2', 'onoff.3'],
    quirks: { zclOnly: true, hasCustomClusters: true, perEndpointControl: true },
    timing: { appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800 }
  },

  // ══════════════════════════════════════════════════════════════
  // TS0726 BSEED 4-GANG (requires explicit binding - v5.8.79)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'bseed_ts0726_4gang',
    manufacturerName: ['_TZ3002_pzao9ls1', '_TZ3002_vaq2bfcu'],
    productId: 'TS0726',
    deviceType: 'switch',
    protocol: 'zcl',
    gangCount: 4,
    endpoints: [1, 2, 3, 4],
    clusters: {
      1: { onOff: { bind: true, report: ['onOff'], directReporting: true } },
      2: { onOff: { bind: true, report: ['onOff'], directReporting: true } },
      3: { onOff: { bind: true, report: ['onOff'], directReporting: true } },
      4: { onOff: { bind: true, report: ['onOff'], directReporting: true } }
    },
    capabilities: ['onoff', 'onoff.2', 'onoff.3', 'onoff.4'],
    quirks: {
      zclOnly: true,
      requiresExplicitBinding: true,
      directReportingOnly: true,
      perEndpointControl: true
    },
    timing: { appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800 }
  },

  // ══════════════════════════════════════════════════════════════
  // TS0601 TUYA DP SWITCHES
  // ══════════════════════════════════════════════════════════════

  {
    id: 'ts0601_switch_1gang',
    productId: 'TS0601',
    manufacturerName: [
      '_TZE200_amp6tsvy', '_TZE200_aqnazj70', '_TZE200_bynnczcb',
      '_TZE200_dfxkcots', '_TZE200_g1ib5ldv', '_TZE200_gbagoilo',
      '_TZE200_wfxuhoea', '_TZE204_amp6tsvy', '_TZE204_wfxuhoea'
    ],
    deviceType: 'switch',
    protocol: 'tuya_dp',
    gangCount: 1,
    dpMappings: {
      1: { capability: 'onoff', type: 'bool' },
      14: { capability: null, setting: 'power_on_behavior', type: 'enum' },
      15: { capability: null, setting: 'backlight_mode', type: 'enum', values: { off: 0, normal: 1, inverted: 2 } }
    },
    capabilities: ['onoff'],
    quirks: {},
    timing: { appCommandWindow: 500 }
  },

  // ══════════════════════════════════════════════════════════════
  // MULTI-GANG ZCL (TS0011-TS0014 - NO Tuya DP)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'ts0011_default',
    productId: 'TS0011',
    deviceType: 'switch',
    protocol: 'zcl',
    gangCount: 1,
    endpoints: [1],
    clusters: { 1: { onOff: { bind: true, report: ['onOff'] } } },
    capabilities: ['onoff'],
    quirks: {},
    timing: { appCommandWindow: 500 }
  },

  {
    id: 'ts0012_default',
    productId: 'TS0012',
    deviceType: 'switch',
    protocol: 'zcl',
    gangCount: 2,
    endpoints: [1, 2],
    clusters: {
      1: { onOff: { bind: true, report: ['onOff'] } },
      2: { onOff: { bind: true, report: ['onOff'] } }
    },
    capabilities: ['onoff', 'onoff.2'],
    quirks: {},
    timing: { appCommandWindow: 500 }
  },

  {
    id: 'ts0013_default',
    productId: 'TS0013',
    deviceType: 'switch',
    protocol: 'zcl',
    gangCount: 3,
    endpoints: [1, 2, 3],
    clusters: {
      1: { onOff: { bind: true, report: ['onOff'] } },
      2: { onOff: { bind: true, report: ['onOff'] } },
      3: { onOff: { bind: true, report: ['onOff'] } }
    },
    capabilities: ['onoff', 'onoff.2', 'onoff.3'],
    quirks: {},
    timing: { appCommandWindow: 500 }
  },

  {
    id: 'ts0014_default',
    productId: 'TS0014',
    deviceType: 'switch',
    protocol: 'zcl',
    gangCount: 4,
    endpoints: [1, 2, 3, 4],
    clusters: {
      1: { onOff: { bind: true, report: ['onOff'] } },
      2: { onOff: { bind: true, report: ['onOff'] } },
      3: { onOff: { bind: true, report: ['onOff'] } },
      4: { onOff: { bind: true, report: ['onOff'] } }
    },
    capabilities: ['onoff', 'onoff.2', 'onoff.3', 'onoff.4'],
    quirks: {},
    timing: { appCommandWindow: 500 }
  },

  // ══════════════════════════════════════════════════════════════
  // DEVICE TYPE DEFAULT
  // ══════════════════════════════════════════════════════════════

  {
    id: 'switch_default',
    deviceType: 'switch',
    isDefault: true,
    protocol: 'zcl',
    gangCount: 1,
    endpoints: [1],
    clusters: { 1: { onOff: { bind: true, report: ['onOff'] } } },
    dpMappings: { 1: { capability: 'onoff', type: 'bool' } },
    capabilities: ['onoff'],
    quirks: {},
    timing: { appCommandWindow: 500 }
  }
];

module.exports = SWITCH_PROFILES;
