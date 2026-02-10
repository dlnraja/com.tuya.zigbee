'use strict';

/**
 * Cover/Curtain Device Profiles - v5.8.80
 * Covers: TS0601 curtains, TS130F ZCL, TS0302, blind motors
 */

const COVER_PROFILES = [

  // TS130F ZCL Window Covering (e.g. _TZ3000_bs93npae - Tbao fix v5.8.79)
  {
    id: 'ts130f_zcl_cover',
    productId: 'TS130F',
    deviceType: 'cover',
    protocol: 'zcl',
    endpoints: [1],
    clusters: {
      1: { windowCovering: { bind: true, report: ['currentPositionLiftPercentage', 'currentPositionTiltPercentage'] } }
    },
    capabilities: ['windowcoverings_set', 'windowcoverings_tilt_set'],
    dpMappings: {},
    quirks: { skipTuyaDPListener: true, skipCalibration: true },
    timing: {}
  },

  // Exact match for known ZCL cover manufacturers
  {
    id: 'ts130f_zcl_known',
    manufacturerName: [
      '_TZ3000_bs93npae', '_TZ3000_1dd0d5yi', '_TZ3000_4uuaja4a',
      '_TZ3000_68jzxlda', '_TZ3000_8h7wgocw', '_TZ3000_dbpmpco1',
      '_TZ3000_egwbefq0', '_TZ3000_fccpjz5z', '_TZ3000_femsaaua',
      '_TZ3000_j1xl73iw', '_TZ3000_ltiqubue', '_TZ3000_vp4uxfkx'
    ],
    productId: 'TS130F',
    deviceType: 'cover',
    protocol: 'zcl',
    endpoints: [1],
    clusters: {
      1: { windowCovering: { bind: true, report: ['currentPositionLiftPercentage'] } }
    },
    capabilities: ['windowcoverings_set'],
    dpMappings: {},
    quirks: { skipTuyaDPListener: true, skipCalibration: true },
    timing: {}
  },

  // TS0601 Tuya DP Curtain (standard)
  {
    id: 'ts0601_curtain_standard',
    productId: 'TS0601',
    manufacturerName: [
      '_TZE200_5zbp6j0u', '_TZE200_cowvfni3', '_TZE200_cpbo62rn',
      '_TZE200_eevqq1uv', '_TZE200_fctwhugx', '_TZE200_fzo2pocs',
      '_TZE200_gubdgai2', '_TZE200_hsgrhjpf', '_TZE200_iossyxra',
      '_TZE200_nkoabg8w', '_TZE200_nogaemzt', '_TZE200_pk0sfzvr',
      '_TZE200_rddyvrci', '_TZE200_wmcdj3aq', '_TZE200_xaabybja',
      '_TZE200_zah67ekd', '_TZE200_zpzndjez',
      '_TZE204_5zbp6j0u', '_TZE204_nogaemzt', '_TZE204_rddyvrci'
    ],
    deviceType: 'cover',
    protocol: 'tuya_dp',
    dpMappings: {
      1: { capability: null, command: 'control', type: 'enum', values: { open: 0, stop: 1, close: 2 } },
      2: { capability: 'windowcoverings_set', type: 'value', divisor: 1 },
      3: { capability: 'windowcoverings_set', type: 'value', divisor: 1, readOnly: true },
      5: { capability: null, setting: 'direction', type: 'enum', values: { forward: 0, reverse: 1 } },
      7: { capability: null, setting: 'work_state', type: 'enum' }
    },
    capabilities: ['windowcoverings_set'],
    quirks: { positionInvert: false },
    timing: {}
  },

  // TS0601 Curtain with tilt (blinds)
  {
    id: 'ts0601_blind_with_tilt',
    productId: 'TS0601',
    manufacturerName: [
      '_TZE200_al1qlyde', '_TZE200_fhn3negr', '_TZE200_lnbfnyxd',
      '_TZE204_al1qlyde', '_TZE204_fhn3negr'
    ],
    deviceType: 'cover',
    protocol: 'tuya_dp',
    dpMappings: {
      1: { capability: null, command: 'control', type: 'enum', values: { open: 0, stop: 1, close: 2 } },
      2: { capability: 'windowcoverings_set', type: 'value', divisor: 1 },
      3: { capability: 'windowcoverings_set', type: 'value', divisor: 1, readOnly: true },
      5: { capability: null, setting: 'direction', type: 'enum' },
      101: { capability: 'windowcoverings_tilt_set', type: 'value', divisor: 1 }
    },
    capabilities: ['windowcoverings_set', 'windowcoverings_tilt_set'],
    quirks: {},
    timing: {}
  },

  // TS0302 ZCL curtain
  {
    id: 'ts0302_zcl_curtain',
    productId: 'TS0302',
    deviceType: 'cover',
    protocol: 'zcl',
    endpoints: [1],
    clusters: {
      1: { windowCovering: { bind: true, report: ['currentPositionLiftPercentage'] } }
    },
    capabilities: ['windowcoverings_set'],
    dpMappings: {},
    quirks: { skipTuyaDPListener: true },
    timing: {}
  },

  // Default cover
  {
    id: 'cover_default',
    deviceType: 'cover',
    isDefault: true,
    protocol: 'tuya_dp',
    dpMappings: {
      1: { capability: null, command: 'control', type: 'enum', values: { open: 0, stop: 1, close: 2 } },
      2: { capability: 'windowcoverings_set', type: 'value', divisor: 1 },
      3: { capability: 'windowcoverings_set', type: 'value', divisor: 1, readOnly: true }
    },
    capabilities: ['windowcoverings_set'],
    quirks: {},
    timing: {}
  }
];

module.exports = COVER_PROFILES;
