'use strict';

/**
 * Sensor Device Profiles - v5.8.80
 * Covers: contact, motion, water leak, climate, smoke, vibration, illuminance
 */

const SENSOR_PROFILES = [

  // ══════════════════════ CONTACT SENSORS ══════════════════════

  {
    id: 'contact_zcl_ias',
    productId: ['TS0203', 'TS0601'],
    deviceType: 'sensor_contact',
    protocol: 'zcl',
    battery: { powered: true, type: 'CR2032' },
    clusters: { 1: { iasZone: { bind: true }, battery: { bind: true, report: ['batteryPercentageRemaining'] } } },
    capabilities: ['alarm_contact', 'measure_battery'],
    quirks: {},
    timing: {}
  },

  {
    id: 'contact_zcl_inverted',
    manufacturerName: ['_TZ3000_996rpfy6', '_TZ3000_oxslv1c9', '_TZ3000_p6ju8myv'],
    productId: 'TS0203',
    deviceType: 'sensor_contact',
    protocol: 'zcl',
    battery: { powered: true, type: 'CR2032' },
    clusters: { 1: { iasZone: { bind: true }, battery: { bind: true, report: ['batteryPercentageRemaining'] } } },
    capabilities: ['alarm_contact', 'measure_battery'],
    quirks: { invertContact: true },
    timing: {}
  },

  {
    id: 'contact_tuya_dp',
    productId: 'TS0601',
    manufacturerName: ['_TZE200_pay2byax', '_TZE200_n8dljorx', '_TZE204_pay2byax'],
    deviceType: 'sensor_contact',
    protocol: 'tuya_dp',
    battery: { powered: true, type: 'CR2032' },
    dpMappings: {
      1: { capability: 'alarm_contact', type: 'bool', invert: true },
      3: { capability: 'measure_battery', type: 'value', divisor: 1 }
    },
    capabilities: ['alarm_contact', 'measure_battery'],
    quirks: {},
    timing: {}
  },

  // ══════════════════════ MOTION SENSORS ══════════════════════

  {
    id: 'motion_zcl_pir',
    productId: ['TS0202', 'TS0210'],
    deviceType: 'sensor_motion',
    protocol: 'zcl',
    battery: { powered: true, type: 'CR2450' },
    clusters: {
      1: {
        iasZone: { bind: true },
        occupancySensing: { bind: true, report: ['occupancy'] },
        battery: { bind: true, report: ['batteryPercentageRemaining'] }
      }
    },
    capabilities: ['alarm_motion', 'measure_battery'],
    quirks: {},
    timing: {}
  },

  {
    id: 'motion_pir_with_lux',
    productId: ['TS0202', 'TS0601'],
    manufacturerName: [
      '_TZ3000_6zvw5uht', '_TZ3000_kqvb5akv', '_TZ3000_lf56vpxj',
      '_TZ3000_nss8amz9', '_TZ3040_6ygjfyll'
    ],
    deviceType: 'sensor_motion',
    protocol: 'zcl',
    battery: { powered: true, type: 'CR2450' },
    clusters: {
      1: {
        iasZone: { bind: true },
        illuminanceMeasurement: { bind: true, report: ['measuredValue'] },
        battery: { bind: true, report: ['batteryPercentageRemaining'] }
      }
    },
    capabilities: ['alarm_motion', 'measure_luminance', 'measure_battery'],
    quirks: {},
    timing: {}
  },

  {
    id: 'motion_tuya_dp_pir',
    productId: 'TS0601',
    manufacturerName: ['_TZE200_3towulqd', '_TZE200_bh3n6gk8', '_TZE204_3towulqd'],
    deviceType: 'sensor_motion',
    protocol: 'tuya_dp',
    battery: { powered: true, type: 'CR2450' },
    dpMappings: {
      1: { capability: 'alarm_motion', type: 'bool' },
      4: { capability: 'measure_battery', type: 'value', divisor: 1 },
      9: { capability: null, setting: 'pir_sensitivity', type: 'enum' },
      10: { capability: null, setting: 'pir_keep_time', type: 'enum' },
      12: { capability: 'measure_luminance', type: 'value', divisor: 1 }
    },
    capabilities: ['alarm_motion', 'measure_battery'],
    quirks: {},
    timing: {}
  },

  // ══════════════════════ WATER LEAK SENSORS ══════════════════════

  {
    id: 'water_leak_zcl',
    productId: ['TS0207', 'TS0601'],
    deviceType: 'sensor_water',
    protocol: 'zcl',
    battery: { powered: true, type: 'CR2032' },
    clusters: { 1: { iasZone: { bind: true }, battery: { bind: true, report: ['batteryPercentageRemaining'] } } },
    capabilities: ['alarm_water', 'measure_battery'],
    quirks: {},
    timing: {}
  },

  {
    id: 'water_leak_tuya_dp',
    productId: 'TS0601',
    manufacturerName: ['_TZE200_qq9mpfhw', '_TZE200_jthf7vb6', '_TZE204_qq9mpfhw'],
    deviceType: 'sensor_water',
    protocol: 'tuya_dp',
    battery: { powered: true, type: 'AAA' },
    dpMappings: {
      1: { capability: 'alarm_water', type: 'bool' },
      4: { capability: 'measure_battery', type: 'value', divisor: 1 }
    },
    capabilities: ['alarm_water', 'measure_battery'],
    quirks: {},
    timing: {}
  },

  // ══════════════════════ CLIMATE SENSORS ══════════════════════

  {
    id: 'climate_zcl_temp_humid',
    productId: ['TS0201', 'TS0601'],
    deviceType: 'sensor_climate',
    protocol: 'zcl',
    battery: { powered: true, type: 'CR2032' },
    clusters: {
      1: {
        temperatureMeasurement: { bind: true, report: ['measuredValue'] },
        relativeHumidityMeasurement: { bind: true, report: ['measuredValue'] },
        battery: { bind: true, report: ['batteryPercentageRemaining'] }
      }
    },
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    quirks: {},
    timing: {}
  },

  {
    id: 'climate_tuya_dp',
    productId: 'TS0601',
    manufacturerName: [
      '_TZE200_a8sdabtg', '_TZE200_bjawzodf', '_TZE200_dwcarsat',
      '_TZE200_locansqn', '_TZE200_myd45weu', '_TZE200_pisltm67',
      '_TZE200_qoy0ekbd', '_TZE200_yjjdcqsq', '_TZE200_znbl8dj5',
      '_TZE204_a8sdabtg', '_TZE204_dwcarsat', '_TZE204_myd45weu'
    ],
    deviceType: 'sensor_climate',
    protocol: 'tuya_dp',
    battery: { powered: true, type: 'AAA' },
    dpMappings: {
      1: { capability: 'measure_temperature', type: 'value', divisor: 10 },
      2: { capability: 'measure_humidity', type: 'value', divisor: 1 },
      3: { capability: 'measure_battery', type: 'value', divisor: 1 },
      4: { capability: 'measure_battery', type: 'value', divisor: 1 }
    },
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    quirks: {},
    timing: {}
  },

  {
    id: 'climate_lcd_tuya_dp',
    productId: 'TS0601',
    manufacturerName: [
      '_TZE200_lve3dvpy', '_TZE200_c7emyjom', '_TZE200_vzqtvljm',
      '_TZE204_lve3dvpy', '_TZE204_c7emyjom',
      '_TZE284_vvmbj46n', '_TZE284_oitavov2'
    ],
    deviceType: 'sensor_climate',
    protocol: 'tuya_dp',
    battery: { powered: true, type: 'AAA' },
    dpMappings: {
      1: { capability: 'measure_temperature', type: 'value', divisor: 10 },
      2: { capability: 'measure_humidity', type: 'value', divisor: 1 },
      4: { capability: 'measure_battery', type: 'value', divisor: 1 },
      9: { capability: null, setting: 'temp_unit', type: 'enum' }
    },
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    quirks: { needsTuyaTimeSync: true },
    timing: {}
  },

  // ══════════════════════ SMOKE SENSORS ══════════════════════

  {
    id: 'smoke_zcl_ias',
    productId: ['TS0205', 'TS0601'],
    deviceType: 'sensor_smoke',
    protocol: 'zcl',
    battery: { powered: true, type: 'CR123A' },
    clusters: { 1: { iasZone: { bind: true }, battery: { bind: true, report: ['batteryPercentageRemaining'] } } },
    capabilities: ['alarm_smoke', 'measure_battery'],
    quirks: {},
    timing: {}
  },

  // ══════════════════════ DEFAULTS ══════════════════════

  {
    id: 'sensor_default',
    deviceType: 'sensor',
    isDefault: true,
    protocol: 'zcl',
    battery: { powered: true, type: 'CR2032' },
    clusters: { 1: { iasZone: { bind: true }, battery: { bind: true } } },
    capabilities: ['measure_battery'],
    quirks: {},
    timing: {}
  }
];

module.exports = SENSOR_PROFILES;
