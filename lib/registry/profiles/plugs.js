'use strict';

/**
 * Plug Device Profiles - v5.8.80
 * Covers: TS011F energy plugs, TS0121, TS0601 plugs, water valves
 */

const PLUG_PROFILES = [

  // TS011F Standard Energy Monitoring Plug (ZCL)
  {
    id: 'ts011f_energy_plug',
    productId: 'TS011F',
    deviceType: 'plug',
    protocol: 'zcl',
    endpoints: [1],
    clusters: {
      1: {
        onOff: { bind: true, report: ['onOff'] },
        electricalMeasurement: { bind: true, report: ['activePower', 'rmsCurrent', 'rmsVoltage'] },
        metering: { bind: true, report: ['currentSummDelivered'] }
      }
    },
    capabilities: ['onoff', 'measure_power', 'meter_power', 'measure_current', 'measure_voltage'],
    energyConfig: {
      power: { cluster: 0x0B04, attr: 'activePower', divisor: 10 },
      voltage: { cluster: 0x0B04, attr: 'rmsVoltage', divisor: 10 },
      current: { cluster: 0x0B04, attr: 'rmsCurrent', divisor: 1000 },
      energy: { cluster: 0x0702, attr: 'currentSummDelivered', divisor: 100 }
    },
    quirks: {},
    timing: {}
  },

  // TS011F with specific divisors (Silvercrest/Lidl)
  {
    id: 'ts011f_silvercrest',
    productId: 'TS011F',
    manufacturerName: ['_TZ3000_1obwwnmq', '_TZ3000_vtscrpmw', '_TZ3000_ksw8qtmt'],
    deviceType: 'plug',
    protocol: 'zcl',
    endpoints: [1],
    clusters: {
      1: {
        onOff: { bind: true, report: ['onOff'] },
        electricalMeasurement: { bind: true, report: ['activePower', 'rmsCurrent', 'rmsVoltage'] }
      }
    },
    capabilities: ['onoff', 'measure_power', 'measure_current', 'measure_voltage'],
    energyConfig: {
      power: { cluster: 0x0B04, attr: 'activePower', divisor: 1 },
      voltage: { cluster: 0x0B04, attr: 'rmsVoltage', divisor: 10 },
      current: { cluster: 0x0B04, attr: 'rmsCurrent', divisor: 1000 }
    },
    quirks: {},
    timing: {}
  },

  // TS0601 Tuya DP Energy Plug
  {
    id: 'ts0601_energy_plug',
    productId: 'TS0601',
    manufacturerName: [
      '_TZE200_byzdayie', '_TZE200_fsb6zw01', '_TZE200_ewxhg6o9',
      '_TZE204_byzdayie', '_TZE204_fsb6zw01'
    ],
    deviceType: 'plug',
    protocol: 'tuya_dp',
    dpMappings: {
      1: { capability: 'onoff', type: 'bool' },
      9: { capability: 'measure_current', type: 'value', divisor: 1000 },
      17: { capability: 'meter_power', type: 'value', divisor: 1000 },
      18: { capability: 'measure_power', type: 'value', divisor: 10 },
      19: { capability: 'measure_voltage', type: 'value', divisor: 10 }
    },
    capabilities: ['onoff', 'measure_power', 'meter_power', 'measure_current', 'measure_voltage'],
    quirks: {},
    timing: {}
  },

  // TS0601 DIN Rail Energy Meter
  {
    id: 'ts0601_din_rail',
    productId: 'TS0601',
    manufacturerName: [
      '_TZE200_bkkmqmyo', '_TZE200_eaac7dkw', '_TZE204_bkkmqmyo',
      '_TZE200_lsanae15', '_TZE204_lsanae15'
    ],
    deviceType: 'plug',
    protocol: 'tuya_dp',
    dpMappings: {
      1: { capability: 'onoff', type: 'bool' },
      9: { capability: 'meter_power', type: 'value', divisor: 100 },
      18: { capability: 'measure_power', type: 'value', divisor: 10 },
      19: { capability: 'measure_current', type: 'value', divisor: 1000 },
      20: { capability: 'measure_voltage', type: 'value', divisor: 10 }
    },
    capabilities: ['onoff', 'measure_power', 'meter_power', 'measure_current', 'measure_voltage'],
    quirks: {},
    timing: {}
  },

  // Simple ZCL plug (no energy monitoring)
  {
    id: 'zcl_plug_simple',
    productId: ['TS0121', 'TS011F'],
    deviceType: 'plug',
    protocol: 'zcl',
    endpoints: [1],
    clusters: { 1: { onOff: { bind: true, report: ['onOff'] } } },
    capabilities: ['onoff'],
    quirks: {},
    timing: {}
  },

  // Water valve (uses plug base)
  {
    id: 'ts0601_water_valve',
    productId: 'TS0601',
    manufacturerName: [
      '_TZE200_81isopgh', '_TZE200_htnnfasr', '_TZE200_akjefhj5',
      '_TZE204_81isopgh', '_TZE204_akjefhj5'
    ],
    deviceType: 'plug',
    protocol: 'tuya_dp',
    dpMappings: {
      1: { capability: 'onoff', type: 'bool' },
      9: { capability: null, setting: 'countdown', type: 'value' }
    },
    capabilities: ['onoff'],
    quirks: { isWaterValve: true },
    timing: {}
  },

  // Default plug
  {
    id: 'plug_default',
    deviceType: 'plug',
    isDefault: true,
    protocol: 'zcl',
    clusters: { 1: { onOff: { bind: true, report: ['onOff'] } } },
    capabilities: ['onoff'],
    quirks: {},
    timing: {}
  }
];

module.exports = PLUG_PROFILES;
