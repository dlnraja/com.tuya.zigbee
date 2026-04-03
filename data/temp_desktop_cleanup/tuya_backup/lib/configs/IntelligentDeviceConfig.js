'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      INTELLIGENT DEVICE CONFIGURATION DATABASE - v5.5.255                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Central configuration for ALL Tuya/Zigbee devices                           ║
 * ║  - Auto-detects device type per manufacturerName                             ║
 * ║  - Intelligent DP mappings for each device variant                           ║
 * ║  - Hybrid ZCL + Tuya DP support                                              ║
 * ║  - Smart energy management configurations                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENERGY MONITORING CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const ENERGY_CONFIGS = {
  // Type A: Standard TS011F (most common energy plugs)
  'TS011F_STANDARD': {
    sensors: [
      '_TZ3000_cphmq0q7', '_TZ3000_dpo1ysak', '_TZ3000_ew3ldmgx',
      '_TZ3000_gjnozsaz', '_TZ3000_gvn91tmx', '_TZ3000_hkuahi4e',
      '_TZ3000_iv6ph5tr', '_TZ3000_jvovfwyk', '_TZ3000_kdi2o9m6',
      '_TZ3000_mlswgkc3', '_TZ3000_okaz9tjs', '_TZ3000_ps3dmato',
      '_TZ3000_qeuvnohg', '_TZ3000_rdtixbnu', '_TZ3000_typdpbpg',
      '_TZ3000_upjrsxh1', '_TZ3000_w0qqde0g', '_TZ3000_waho4ber',
      '_TZ3000_zloso4jk', '_TZ3000_5f43h46b', '_TZ3000_cehuw1lw',
      '_TZ3000_g5xawfcq', '_TZ3000_hdopuwv6', '_TZ3000_mraovvmm',
      '_TZ3000_ss98ec5d', '_TZ3000_uwkja6z1', '_TZ3000_yujkchbz',
    ],
    protocol: 'zcl',
    clusters: {
      electricalMeasurement: 0x0B04,
      metering: 0x0702,
    },
    attributes: {
      power: { cluster: 0x0B04, attr: 'activePower', divisor: 10, unit: 'W' },
      voltage: { cluster: 0x0B04, attr: 'rmsVoltage', divisor: 10, unit: 'V' },
      current: { cluster: 0x0B04, attr: 'rmsCurrent', divisor: 1000, unit: 'A' },
      energy: { cluster: 0x0702, attr: 'currentSummDelivered', divisor: 100, unit: 'kWh' },
    }
  },

  // Type B: Tuya DP Energy (TS0601 plugs)
  'TS0601_ENERGY': {
    sensors: [
      '_TZE200_byzdayie', '_TZE200_fsb6zw01', '_TZE200_ewxhg6o9',
      '_TZE204_byzdayie', '_TZE204_fsb6zw01',
    ],
    protocol: 'tuya',
    dpMap: {
      1: { cap: 'onoff', type: 'bool' },
      9: { cap: 'measure_current', divisor: 1000 },      // mA -> A
      18: { cap: 'measure_power', divisor: 10 },         // dW -> W
      19: { cap: 'measure_voltage', divisor: 10 },       // dV -> V
      17: { cap: 'meter_power', divisor: 1000 },         // Wh -> kWh
    }
  },

  // Type C: Din Rail Energy Meters
  'DIN_RAIL_METER': {
    sensors: [
      '_TZE200_bkkmqmyo', '_TZE200_eaac7dkw', '_TZE204_bkkmqmyo',
      '_TZE200_lsanae15', '_TZE204_lsanae15',
    ],
    protocol: 'tuya',
    dpMap: {
      1: { cap: 'onoff', type: 'bool' },
      6: { cap: null, internal: 'report_interval' },
      9: { cap: 'meter_power', divisor: 100 },           // Total energy
      16: { cap: 'onoff', type: 'bool' },                // Switch state
      17: { cap: 'meter_power', divisor: 100 },          // Energy A
      18: { cap: 'measure_power', divisor: 10 },         // Power
      19: { cap: 'measure_current', divisor: 1000 },     // Current
      20: { cap: 'measure_voltage', divisor: 10 },       // Voltage
      21: { cap: null, internal: 'frequency' },          // Frequency
      101: { cap: null, internal: 'power_factor' },
      102: { cap: null, internal: 'energy_a' },
      103: { cap: null, internal: 'energy_b' },
    }
  },

  // Type D: Silvercrest/Lidl plugs
  'SILVERCREST_ENERGY': {
    sensors: [
      '_TZ3000_1obwwnmq', '_TZ3000_vtscrpmw', '_TZ3000_ksw8qtmt',
    ],
    protocol: 'zcl',
    clusters: {
      electricalMeasurement: 0x0B04,
    },
    attributes: {
      power: { cluster: 0x0B04, attr: 'activePower', divisor: 1, unit: 'W' },
      voltage: { cluster: 0x0B04, attr: 'rmsVoltage', divisor: 10, unit: 'V' },
      current: { cluster: 0x0B04, attr: 'rmsCurrent', divisor: 1000, unit: 'A' },
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLIMATE SENSOR CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CLIMATE_CONFIGS = {
  // Type A: Standard ZCL Temperature/Humidity
  'ZCL_TEMP_HUMID': {
    sensors: [
      '_TZ3000_bjawzodf', '_TZ3000_dowj6gyi', '_TZ3000_fllyghyj',
      '_TZ3000_qaaysllp', '_TZ3000_rdhukkmi', '_TZ3000_rusu2vzb',
      '_TZ3000_saiqcn0y', '_TZ3000_xr3htd96', '_TZ3000_zl1kmjqx',
      '_TZ3210_5rta89nj',
    ],
    protocol: 'zcl',
    battery: true,
    clusters: {
      temperature: 0x0402,
      humidity: 0x0405,
      battery: 0x0001,
    },
    attributes: {
      temperature: { cluster: 0x0402, attr: 'measuredValue', divisor: 100, unit: '°C' },
      humidity: { cluster: 0x0405, attr: 'measuredValue', divisor: 100, unit: '%' },
      battery: { cluster: 0x0001, attr: 'batteryPercentageRemaining', divisor: 2, unit: '%' },
    }
  },

  // Type B: Tuya DP Temperature/Humidity (TS0601)
  'TUYA_TEMP_HUMID': {
    sensors: [
      '_TZE200_a8sdabtg', '_TZE200_bjawzodf', '_TZE200_dwcarsat',
      '_TZE200_locansqn', '_TZE200_myd45weu', '_TZE200_nvups57o',
      '_TZE200_pisltm67', '_TZE200_qoy0ekbd', '_TZE200_yjjdcqsq',
      '_TZE200_znbl8dj5', '_TZE204_a8sdabtg', '_TZE204_dwcarsat',
      '_TZE204_myd45weu', '_TZE204_yjjdcqsq',
    ],
    protocol: 'tuya',
    battery: true,
    dpMap: {
      1: { cap: 'measure_temperature', divisor: 10 },    // °C * 10
      2: { cap: 'measure_humidity', divisor: 1 },        // %
      3: { cap: 'measure_battery', divisor: 1 },         // %
      4: { cap: 'measure_battery', divisor: 1 },         // alt battery
      9: { cap: 'measure_temperature', divisor: 10 },    // alt temp
      10: { cap: 'measure_humidity', divisor: 1 },       // alt humid
    }
  },

  // Type C: LCD Display Sensors
  'LCD_TEMP_HUMID': {
    sensors: [
      '_TZE200_lve3dvpy', '_TZE200_c7emyjom', '_TZE200_vzqtvljm',
      '_TZE204_lve3dvpy', '_TZE204_c7emyjom',
    ],
    protocol: 'tuya',
    battery: true,
    dpMap: {
      1: { cap: 'measure_temperature', divisor: 10 },
      2: { cap: 'measure_humidity', divisor: 1 },
      4: { cap: 'measure_battery', divisor: 1 },
      9: { cap: null, internal: 'temp_unit' },           // C/F
      10: { cap: null, internal: 'temp_max' },
      11: { cap: null, internal: 'temp_min' },
      12: { cap: null, internal: 'humid_max' },
      13: { cap: null, internal: 'humid_min' },
      14: { cap: null, internal: 'temp_alarm' },
      15: { cap: null, internal: 'humid_alarm' },
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOTION/PIR SENSOR CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const MOTION_CONFIGS = {
  // Type A: Standard ZCL PIR
  'ZCL_PIR': {
    sensors: [
      '_TZ3000_6ygjfyll', '_TZ3000_bsvqrxru', '_TZ3000_h4wnrtck',
      '_TZ3000_hktqahrq', '_TZ3000_kmh5qpmb', '_TZ3000_mcxw5ehu',
      '_TZ3000_msl6wxk9', '_TZ3000_otvn3lne', '_TZ3000_pirdnum9',
      '_TZ3000_rruw1hph', '_TZ3000_usvkzkyn', '_TZ3000_yr21qkta',
      '_TZ3040_bb6xaihh', '_TZ3040_wqmtjsyk', '_TYZB01_dl7cejts',
    ],
    protocol: 'zcl',
    battery: true,
    clusters: {
      occupancy: 0x0406,
      battery: 0x0001,
      iasZone: 0x0500,
    },
    attributes: {
      motion: { cluster: 0x0406, attr: 'occupancy', transform: (v) => (v & 0x01) !== 0 },
      battery: { cluster: 0x0001, attr: 'batteryPercentageRemaining', divisor: 2 },
    }
  },

  // Type B: Tuya DP PIR
  'TUYA_PIR': {
    sensors: [
      '_TZE200_3towulqd', '_TZE200_bh3n6gk8', '_TZE200_ya4ft0w4',
      '_TZE204_3towulqd', '_TZE204_ya4ft0w4',
    ],
    protocol: 'tuya',
    battery: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'bool' },
      4: { cap: 'measure_battery', divisor: 1 },
      9: { cap: null, internal: 'sensitivity' },
      10: { cap: null, internal: 'keep_time' },
      12: { cap: null, internal: 'illuminance_level' },
    }
  },

  // Type C: PIR with Illuminance
  'PIR_ILLUMINANCE': {
    sensors: [
      '_TZ3000_6zvw5uht', '_TZ3000_kqvb5akv', '_TZ3000_lf56vpxj',
      '_TZ3000_nss8amz9', '_TZ3000_ykwcwxmz', '_TZ3040_6ygjfyll',
    ],
    protocol: 'zcl',
    battery: true,
    clusters: {
      occupancy: 0x0406,
      illuminance: 0x0400,
      battery: 0x0001,
    },
    attributes: {
      motion: { cluster: 0x0406, attr: 'occupancy', transform: (v) => (v & 0x01) !== 0 },
      illuminance: { cluster: 0x0400, attr: 'measuredValue', transform: (v) => Math.pow(10, (v - 1) / 10000) },
      battery: { cluster: 0x0001, attr: 'batteryPercentageRemaining', divisor: 2 },
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SWITCH CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const SWITCH_CONFIGS = {
  // Type A: Standard ZCL On/Off (TS0001, TS0011, etc)
  'ZCL_SWITCH': {
    sensors: [
      '_TZ3000_46t1rvdu', '_TZ3000_4uf3d0ax', '_TZ3000_5ng23zjs',
      '_TZ3000_9hpxg80k', '_TZ3000_ark8nv4y', '_TZ3000_cfnprab5',
      '_TZ3000_csflgqj2', '_TZ3000_iy2c3n6p', '_TZ3000_ji4araar',
      '_TZ3000_mx3vgyea', '_TZ3000_npzfdcof', '_TZ3000_pfc7i3kt',
      '_TZ3000_qmi1cfuq', '_TZ3000_skueekg3', '_TZ3000_tqlv4uj4',
      '_TZ3000_txpirhfq', '_TZ3000_wkr3jqmr', '_TZ3000_wyhuocal',
      '_TZ3000_zmy4lslw', '_TZ3000_zmy1waw6',
    ],
    protocol: 'zcl',
    clusters: {
      onOff: 0x0006,
    },
    endpoints: [1],
  },

  // Type B: Tuya DP Switch (TS0601)
  'TUYA_SWITCH': {
    sensors: [
      '_TZE200_amp6tsvy', '_TZE200_aqnazj70', '_TZE200_bynnczcb',
      '_TZE200_dfxkcots', '_TZE200_g1ib5ldv', '_TZE200_gbagoilo',
      '_TZE200_wfxuhoea', '_TZE204_amp6tsvy', '_TZE204_wfxuhoea',
    ],
    protocol: 'tuya',
    dpMap: {
      1: { cap: 'onoff', type: 'bool', endpoint: 1 },
      2: { cap: 'onoff.2', type: 'bool', endpoint: 2 },
      3: { cap: 'onoff.3', type: 'bool', endpoint: 3 },
      4: { cap: 'onoff.4', type: 'bool', endpoint: 4 },
      7: { cap: null, internal: 'countdown_1' },
      8: { cap: null, internal: 'countdown_2' },
      9: { cap: null, internal: 'countdown_3' },
      10: { cap: null, internal: 'countdown_4' },
    }
  },

  // Type C: Multi-gang ZCL (TS0002, TS0003, etc)
  'ZCL_MULTI_SWITCH': {
    sensors: [
      '_TZ3000_18ejxno0', '_TZ3000_1h2x4akh', '_TZ3000_4js9lo5d',
      '_TZ3000_7hp93pqk', '_TZ3000_a7ouggvs', '_TZ3000_fvh3pjaz',
      '_TZ3000_gktj45xs', '_TZ3000_hzajtxcg', '_TZ3000_jl7qyupf',
      '_TZ3000_ks7qh3vs', '_TZ3000_lubfc1t5', '_TZ3000_qgwcxxws',
      '_TZ3000_vjhcenzo', '_TZ3000_wkai4ga5', '_TZ3000_zmy1waw6',
    ],
    protocol: 'zcl',
    clusters: {
      onOff: 0x0006,
    },
    endpoints: [1, 2, 3, 4, 5, 6],  // Dynamic based on device
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTACT SENSOR CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CONTACT_CONFIGS = {
  // Type A: ZCL IAS Zone
  'ZCL_CONTACT': {
    sensors: [
      '_TZ3000_26fmupbb', '_TZ3000_2mbfxlzr', '_TZ3000_402jjyro',
      '_TZ3000_4fsgukof', '_TZ3000_7d8yme6f', '_TZ3000_8znnbdse',
      '_TZ3000_a9mpjbey', '_TZ3000_aduampsn', '_TZ3000_au1rjicn',
      '_TZ3000_bzxnxfay', '_TZ3000_cc3jzhlj', '_TZ3000_clgoyymf',
      '_TZ3000_d7xqtpyp', '_TZ3000_decxrtwa', '_TZ3000_e6hp3qvf',
      '_TZ3000_ebar6ljy', '_TZ3000_f0fpfykh', '_TZ3000_gntwytxo',
    ],
    protocol: 'zcl',
    battery: true,
    clusters: {
      iasZone: 0x0500,
      battery: 0x0001,
    },
    attributes: {
      contact: { cluster: 0x0500, attr: 'zoneStatus', transform: (v) => (v & 0x01) === 0 },
      battery: { cluster: 0x0001, attr: 'batteryPercentageRemaining', divisor: 2 },
    }
  },

  // Type B: Tuya DP Contact
  'TUYA_CONTACT': {
    sensors: [
      '_TZE200_pay2byax', '_TZE200_n8dljorx', '_TZE204_pay2byax',
    ],
    protocol: 'tuya',
    battery: true,
    dpMap: {
      1: { cap: 'alarm_contact', type: 'bool', invert: true },
      3: { cap: 'measure_battery', divisor: 1 },
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// THERMOSTAT CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const THERMOSTAT_CONFIGS = {
  // Type A: Standard Tuya TRV
  'TUYA_TRV': {
    sensors: [
      '_TZE200_aoclfnxz', '_TZE200_b6wax7g0', '_TZE200_bvu2wnxz',
      '_TZE200_c88teujp', '_TZE200_chyvmhay', '_TZE200_cwnjrr72',
      '_TZE200_dzuqwsyg', '_TZE200_ektmgtyh', '_TZE200_fhn3negr',
      '_TZE200_gd4rvykv', '_TZE200_husqqvux', '_TZE200_hvx6riom',
      '_TZE200_kds0pmmv', '_TZE200_kfvq6avy', '_TZE200_lnbfnyxd',
      '_TZE200_mudxchsu', '_TZE200_sur6q7ko', '_TZE200_yw7cahqs',
      '_TZE200_zion52ef', '_TZE204_aoclfnxz', '_TZE204_bvu2wnxz',
      '_TZE204_cjbofhxw', '_TZE204_xnbkhhdr', '_TZE200_viy9ihs7',
    ],
    protocol: 'tuya',
    dpMap: {
      2: { cap: 'target_temperature', divisor: 10 },     // Target temp
      3: { cap: 'measure_temperature', divisor: 10 },    // Current temp
      4: { cap: null, internal: 'mode' },                // Mode
      7: { cap: null, internal: 'child_lock' },
      13: { cap: 'measure_battery', divisor: 1 },        // Battery
      14: { cap: null, internal: 'valve_state' },
      101: { cap: null, internal: 'window_detection' },
      102: { cap: null, internal: 'boost_heating' },
      103: { cap: null, internal: 'comfort_temp' },
      104: { cap: null, internal: 'eco_temp' },
    }
  },

  // Type B: Moes TRV
  'MOES_TRV': {
    sensors: [
      '_TZE200_ckud7u2l', '_TZE200_ywdxldoj', '_TZE200_cwnjrr72',
      '_TZE200_2atgpdho', '_TZE200_pvvbommb',
    ],
    protocol: 'tuya',
    dpMap: {
      2: { cap: null, internal: 'mode' },
      3: { cap: null, internal: 'heating_state' },
      4: { cap: 'target_temperature', divisor: 1 },      // MOES uses integer
      5: { cap: 'measure_temperature', divisor: 10 },
      7: { cap: null, internal: 'child_lock' },
      35: { cap: 'measure_battery', divisor: 1 },
      36: { cap: null, internal: 'frost_protection' },
      39: { cap: null, internal: 'calibration' },
      45: { cap: null, internal: 'valve_state' },
      101: { cap: null, internal: 'schedule_monday' },
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// WATER LEAK SENSOR CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const WATER_LEAK_CONFIGS = {
  // Type A: ZCL IAS Zone
  'ZCL_WATER_LEAK': {
    sensors: [
      '_TZ3000_abjqdnsz', '_TZ3000_ark8nv4y', '_TZ3000_eivsf1h6',
      '_TZ3000_fgrlqvzz', '_TZ3000_k4ej3ww2', '_TZ3000_kstbkt6a',
      '_TZ3000_kyb656no', '_TZ3000_mugyhz0q', '_TZ3000_nfyd3yzu',
      '_TZ3000_t5ejziyq', '_TZ3000_upgcbody', '_TZ3000_w7rtqhct',
      '_TZ3000_wbloefbf', '_TZ3000_wy3fxxnt',
    ],
    protocol: 'zcl',
    battery: true,
    clusters: {
      iasZone: 0x0500,
      battery: 0x0001,
    },
    attributes: {
      water: { cluster: 0x0500, attr: 'zoneStatus', transform: (v) => (v & 0x01) !== 0 },
      battery: { cluster: 0x0001, attr: 'batteryPercentageRemaining', divisor: 2 },
    }
  },

  // Type B: Tuya DP Water Leak
  'TUYA_WATER_LEAK': {
    sensors: [
      '_TZE200_qq9mpfhw', '_TZE200_jthf7vb6', '_TZE204_qq9mpfhw',
    ],
    protocol: 'tuya',
    battery: true,
    dpMap: {
      1: { cap: 'alarm_water', type: 'bool' },
      4: { cap: 'measure_battery', divisor: 1 },
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CURTAIN/COVER CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CURTAIN_CONFIGS = {
  // Type A: Tuya DP Curtain
  'TUYA_CURTAIN': {
    sensors: [
      '_TZE200_5zbp6j0u', '_TZE200_cowvfni3', '_TZE200_cpbo62rn',
      '_TZE200_eevqq1uv', '_TZE200_fctwhugx', '_TZE200_fzo2pocs',
      '_TZE200_gubdgai2', '_TZE200_hsgrhjpf', '_TZE200_iossyxra',
      '_TZE200_nkoabg8w', '_TZE200_nogaemzt', '_TZE200_pk0sfzvr',
      '_TZE200_rddyvrci', '_TZE200_wmcdj3aq', '_TZE200_xaabybja',
      '_TZE200_zah67ekd', '_TZE200_zpzndjez', '_TZ3210_zana8d08',
    ],
    protocol: 'tuya',
    dpMap: {
      1: { cap: null, internal: 'control' },             // open/close/stop
      2: { cap: 'windowcoverings_set', divisor: 1 },     // position 0-100
      3: { cap: 'windowcoverings_set', divisor: 1 },     // current position
      5: { cap: null, internal: 'direction' },
      7: { cap: null, internal: 'work_state' },
      101: { cap: 'windowcoverings_tilt_set', divisor: 1 }, // tilt 0-100
    }
  },

  // Type B: ZCL Window Covering
  'ZCL_CURTAIN': {
    sensors: [
      '_TZ3000_1dd0d5yi', '_TZ3000_4uuaja4a', '_TZ3000_68jzxlda',
      '_TZ3000_8h7wgocw', '_TZ3000_dbpmpco1', '_TZ3000_egwbefq0',
      '_TZ3000_fccpjz5z', '_TZ3000_femsaaua', '_TZ3000_j1xl73iw',
      '_TZ3000_ltiqubue', '_TZ3000_qdpqdszn', '_TZ3000_vp4uxfkx',
    ],
    protocol: 'zcl',
    clusters: {
      windowCovering: 0x0102,
    },
    attributes: {
      position: { cluster: 0x0102, attr: 'currentPositionLiftPercentage', divisor: 1 },
      tilt: { cluster: 0x0102, attr: 'currentPositionTiltPercentage', divisor: 1 },
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SMART PLUG CONFIGURATIONS (NO ENERGY)
// ═══════════════════════════════════════════════════════════════════════════════

const PLUG_CONFIGS = {
  // Type A: Standard ZCL Plug
  'ZCL_PLUG': {
    sensors: [
      '_TZ3000_3ooaz3ng', '_TZ3000_4uf3d0ax', '_TZ3000_5f43h46b',
      '_TZ3000_8nkb7mof', '_TZ3000_9vo5icau', '_TZ3000_amdymr7l',
      '_TZ3000_b28wrpvx', '_TZ3000_cehuw1lw', '_TZ3000_dpo1ysak',
      '_TZ3000_f089gmfc', '_TZ3000_g5xawfcq', '_TZ3000_gjnozsaz',
      '_TZ3000_hdopuwv6', '_TZ3000_kdi2o9m6', '_TZ3000_mraovvmm',
      '_TZ3000_okaz9tjs', '_TZ3000_ps3dmato', '_TZ3000_rdtixbnu',
      '_TZ3000_sxbok5uj', '_TZ3000_typdpbpg', '_TZ3000_w0qqde0g',
    ],
    protocol: 'zcl',
    clusters: {
      onOff: 0x0006,
    },
  },

  // Type B: Tuya DP Plug
  'TUYA_PLUG': {
    sensors: [
      '_TZE200_akjefhj5', '_TZE200_htnnfasr', '_TZE204_akjefhj5',
    ],
    protocol: 'tuya',
    dpMap: {
      1: { cap: 'onoff', type: 'bool' },
      9: { cap: null, internal: 'countdown' },
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Build reverse lookup maps
function buildConfigMap(configs) {
  const map = {};
  for (const [configName, config] of Object.entries(configs)) {
    for (const mfr of (config.sensors || [])) {
      map[mfr] = { ...config, configName };
    }
  }
  return map;
}

const ENERGY_MAP = buildConfigMap(ENERGY_CONFIGS);
const CLIMATE_MAP = buildConfigMap(CLIMATE_CONFIGS);
const MOTION_MAP = buildConfigMap(MOTION_CONFIGS);
const SWITCH_MAP = buildConfigMap(SWITCH_CONFIGS);
const CONTACT_MAP = buildConfigMap(CONTACT_CONFIGS);
const THERMOSTAT_MAP = buildConfigMap(THERMOSTAT_CONFIGS);
const WATER_LEAK_MAP = buildConfigMap(WATER_LEAK_CONFIGS);
const CURTAIN_MAP = buildConfigMap(CURTAIN_CONFIGS);
const PLUG_MAP = buildConfigMap(PLUG_CONFIGS);

/**
 * Get device configuration by manufacturerName and device type
 */
function getDeviceConfig(manufacturerName, deviceType) {
  const maps = {
    energy: ENERGY_MAP,
    climate: CLIMATE_MAP,
    motion: MOTION_MAP,
    switch: SWITCH_MAP,
    contact: CONTACT_MAP,
    thermostat: THERMOSTAT_MAP,
    water_leak: WATER_LEAK_MAP,
    curtain: CURTAIN_MAP,
    plug: PLUG_MAP,
  };

  const map = maps[deviceType];
  if (map && map[manufacturerName]) {
    return map[manufacturerName];
  }

  // Return default config based on device type
  const defaults = {
    energy: ENERGY_CONFIGS.TS011F_STANDARD,
    climate: CLIMATE_CONFIGS.ZCL_TEMP_HUMID,
    motion: MOTION_CONFIGS.ZCL_PIR,
    switch: SWITCH_CONFIGS.ZCL_SWITCH,
    contact: CONTACT_CONFIGS.ZCL_CONTACT,
    thermostat: THERMOSTAT_CONFIGS.TUYA_TRV,
    water_leak: WATER_LEAK_CONFIGS.ZCL_WATER_LEAK,
    curtain: CURTAIN_CONFIGS.TUYA_CURTAIN,
    plug: PLUG_CONFIGS.ZCL_PLUG,
  };

  return defaults[deviceType] || null;
}

/**
 * Transform DP value based on config
 */
function transformDpValue(value, dpConfig) {
  if (!dpConfig) return value;

  if (dpConfig.type === 'bool') {
    if (dpConfig.invert) {
      return !(value === 1 || value === true);
    }
    return value === 1 || value === true;
  }

  if (dpConfig.transform) {
    return dpConfig.transform(value);
  }

  if (dpConfig.divisor) {
    return value / dpConfig.divisor;
  }

  return value;
}

/**
 * Detect protocol (ZCL vs Tuya) from config
 */
function getProtocol(config) {
  return config?.protocol || 'hybrid';
}

/**
 * Check if device is battery-powered
 */
function isBatteryPowered(config) {
  return config?.battery === true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Config databases
  ENERGY_CONFIGS,
  CLIMATE_CONFIGS,
  MOTION_CONFIGS,
  SWITCH_CONFIGS,
  CONTACT_CONFIGS,
  THERMOSTAT_CONFIGS,
  WATER_LEAK_CONFIGS,
  CURTAIN_CONFIGS,
  PLUG_CONFIGS,

  // Config maps
  ENERGY_MAP,
  CLIMATE_MAP,
  MOTION_MAP,
  SWITCH_MAP,
  CONTACT_MAP,
  THERMOSTAT_MAP,
  WATER_LEAK_MAP,
  CURTAIN_MAP,
  PLUG_MAP,

  // Helper functions
  getDeviceConfig,
  transformDpValue,
  getProtocol,
  isBatteryPowered,
  buildConfigMap,
};
