'use strict';

/**
 * Thermostat Device Profiles - v5.8.80
 * Covers: TRVs, thermostats, heater controllers (mostly TS0601)
 */

// A8: NaN Safety - use safeDivide/safeMultiply
const THERMOSTAT_PROFILES = [

  // Standard Tuya TRV
  {
    id: 'tuya_trv_standard',
    productId: 'TS0601',
    manufacturerName: [
      '_TZE200_aoclfnxz', '_TZE200_b6wax7g0', '_TZE200_bvu2wnxz',
      '_TZE200_c88teujp', '_TZE200_chyvmhay', '_TZE200_cwnjrr72',
      '_TZE200_dzuqwsyg', '_TZE200_ektmgtyh', '_TZE200_fhn3negr',
      '_TZE200_gd4rvykv', '_TZE200_husqqvux', '_TZE200_hvx6riom',
      '_TZE200_kds0pmmv', '_TZE200_kfvq6avy', '_TZE200_lnbfnyxd',
      '_TZE200_mudxchsu', '_TZE200_sur6q7ko', '_TZE200_yw7cahqs',
      '_TZE200_zion52ef', '_TZE204_aoclfnxz', '_TZE204_bvu2wnxz',
      '_TZE204_cjbofhxw', '_TZE204_xnbkhhdr'
    ],
    deviceType: 'thermostat',
    protocol: 'tuya_dp',
    battery: { powered: true, type: '2xAA' },
    dpMappings: {
      2: { capability: 'target_temperature', type: 'value', divisor: 10 },
      3: { capability: 'measure_temperature', type: 'value', divisor: 10 },
      4: { setting: 'mode', type: 'enum', values: { off: 0, manual: 1, auto: 2 } },
      7: { setting: 'child_lock', type: 'bool' },
      13: { capability: 'measure_battery', type: 'value', divisor: 1 },
      14: { setting: 'valve_state', type: 'enum' },
      101: { setting: 'window_detection', type: 'bool' },
      104: { setting: 'eco_temp', type: 'value', divisor: 10 }
    },
    capabilities: ['target_temperature', 'measure_temperature', 'measure_battery'],
    quirks: {},
    timing: {}
  },

  // Moes TRV (different DP layout)
  {
    id: 'moes_trv',
    productId: 'TS0601',
    manufacturerName: [
      '_TZE200_ckud7u2l', '_TZE200_ywdxldoj', '_TZE200_2atgpdho',
      '_TZE200_pvvbommb', '_TZE204_ckud7u2l'
    ],
    deviceType: 'thermostat',
    protocol: 'tuya_dp',
    battery: { powered: true, type: '2xAA' },
    dpMappings: {
      2: { setting: 'mode', type: 'enum', values: { off: 0, manual: 1, auto: 2 } },
      4: { capability: 'target_temperature', type: 'value', divisor: 1 },
      5: { capability: 'measure_temperature', type: 'value', divisor: 10 },
      7: { setting: 'child_lock', type: 'bool' },
      35: { capability: 'measure_battery', type: 'value', divisor: 1 },
      45: { setting: 'valve_state', type: 'enum' }
    },
    capabilities: ['target_temperature', 'measure_temperature', 'measure_battery'],
    quirks: { tempDivisor: 1 },
    timing: {}
  },

  // AVATTO ME167 TRV
  {
    id: 'avatto_me167_trv',
    productId: 'TS0601',
    manufacturerName: ['_TZE200_bvu2wnxz', '_TZE204_bvu2wnxz'],
    deviceType: 'thermostat',
    protocol: 'tuya_dp',
    battery: { powered: true, type: '2xAA' },
    dpMappings: {
      2: { capability: 'target_temperature', type: 'value', divisor: 10 },
      3: { capability: 'measure_temperature', type: 'value', divisor: 10 },
      4: { setting: 'mode', type: 'enum' },
      7: { setting: 'child_lock', type: 'bool' },
      35: { capability: 'alarm_battery', type: 'bool' },
      21: { capability: 'measure_battery', type: 'value', divisor: 1 }
    },
    capabilities: ['target_temperature', 'measure_temperature', 'measure_battery', 'alarm_battery'],
    quirks: {},
    timing: {}
  },

  // Default thermostat
  {
    id: 'thermostat_default',
    deviceType: 'thermostat',
    isDefault: true,
    protocol: 'tuya_dp',
    dpMappings: {
      2: { capability: 'target_temperature', type: 'value', divisor: 10 },
      3: { capability: 'measure_temperature', type: 'value', divisor: 10 },
      4: { setting: 'mode', type: 'enum' }
    },
    capabilities: ['target_temperature', 'measure_temperature'],
    quirks: {},
    timing: {}
  }
];

module.exports = THERMOSTAT_PROFILES;
