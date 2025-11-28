'use strict';

/**
 * ULTIMATE ENRICHMENT SCRIPT
 *
 * Sources:
 * - GitHub Issues (#79 curtain motor)
 * - GitHub PRs (#46 AM25 motor)
 * - Forum Thread Analysis (Oct 17)
 * - Ian Gibbo Interview Analysis
 * - MANUFACTURER_IDS_TO_ADD.md
 * - TUYA_CLOUD_DEVICES_ADDED_OCT19.md
 * - ZHA/Zigbee2mqtt databases
 * - Community reports
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// =====================================================
// COMPREHENSIVE MANUFACTURER ID DATABASE
// =====================================================

const ENRICHMENT_DATABASE = {
  // ================== CURTAIN/BLIND MOTORS ==================
  'curtain_motor_ts0601': {
    manufacturerIds: [
      // From Issue #79
      '_TZE200_uj3f4wr5',
      // From PR #46 - AM25 Tubular Motor
      '_TZE200_nv6nxo0c',
      // Additional curtain motors from zigbee2mqtt/ZHA
      '_TZE200_fzo2pocs', '_TZE200_5sbebbzs', '_TZE200_zah67ekh',
      '_TZE200_gubdgai2', '_TZE200_r0jdjrvi', '_TZE200_cpbo62rn',
      '_TZE200_wmcdj3aq', '_TZE200_cowvfni3', '_TZE200_zpzndjez',
      '_TZE200_fdtjuw7u', '_TZE200_bqcqqjpb', '_TZE200_iossyxra',
      '_TZE200_68nvbio9', '_TZE204_guvc7pdy', '_TZE204_r0jdjrvi',
      '_TZE204_zpzndjez', '_TZE204_zah67ekh', '_TZE284_4qznlkbu'
    ],
    productIds: ['TS0601', 'AM25', 'M515EGB']
  },

  // ================== SWITCHES ==================
  'switch_2gang': {
    manufacturerIds: [
      // From Ian Gibbo Interview - TS0002 switch
      '_TZ3000_h1ipgkwn',
      // Additional 2-gang switches
      '_TZ3000_zmy1waw6', '_TZ3000_wkr3jqmr', '_TZ3000_bvrlqyj7',
      '_TZ3000_18ejxno0', '_TZ3000_pmz6mjyu', '_TZ3000_ltt60asa',
      '_TZ3000_jl7qyupf', '_TZ3000_7vcdo2vn', '_TZ3000_4js6g1cw',
      '_TZ3000_tribakzk', '_TZ3000_atp3bews', '_TYZB01_vkwryfdr'
    ],
    productIds: ['TS0002', 'TS0012', 'SM-SW302-2CH']
  },

  'switch_smart_1gang': {
    manufacturerIds: [
      // From Ian Gibbo - battery switch variant
      '_TZ3000_zmlunnhy',
      // Additional 1-gang
      '_TZ3000_qmi1cfuq', '_TZ3000_npzfdcof', '_TZ3000_hktqahrq',
      '_TZ3000_mx3vgyea', '_TZ3000_5ng23zjs', '_TZ3000_rmjr4ufz',
      '_TZ3000_txpitre5', '_TZ3000_tqlv4ez4', '_TZ3000_pmvbt5hh'
    ],
    productIds: ['TS0001', 'TS0011', 'TS0012']
  },

  // ================== SENSORS ==================
  'climate_sensor': {
    manufacturerIds: [
      // From Forum - WRONG driver (was in smoke_detector)
      '_TZ3000_akqdg6g7',
      // Additional temp/humidity sensors
      '_TZ3000_xr3htd96', '_TZ3000_qaaysllp', '_TZ3000_fllyghyj',
      '_TZ3000_yd2e749y', '_TZ3000_6uzkisv2', '_TZ3000_dowj6gyi',
      '_TZ2000_a476raq2', '_TZ3000_bguser20', '_TZ3000_ywagc4rj',
      '_TZ3000_itnrsufe', '_TZ3000_zl1kmjqx', '_TZ3000_saiqcn0y'
    ],
    productIds: ['TS0201', 'TH01', 'RSH-TH01', 'ZTH01', 'ZTH02', 'TT001ZAV20']
  },

  'soil_sensor': {
    manufacturerIds: [
      // From Forum - DutchDuke
      '_TZE284_oitavov2',
      // From PR #47
      '_TZE200_myd45weu',
      // Additional soil sensors
      '_TZE200_ga1maeof', '_TZE200_9yapgbuv', '_TZE200_hhrtiq0x',
      '_TZE204_myd45weu', '_TZE284_sgabhwa6'
    ],
    productIds: ['TS0601', 'Soil-Sensor', 'SZWS']
  },

  'motion_sensor': {
    manufacturerIds: [
      // Additional from ZHA/z2m
      '_TZ3000_mcxw5ehu', '_TZ3000_6ygjfyll', '_TZ3000_kmh5qpmb',
      '_TZ3000_msl6wxk9', '_TZ3000_otvn3lne', '_TZ3000_pirddkfc',
      '_TZ3000_bsvqrxru', '_TZ3000_1obwwnmq', '_TZ3000_nss8amz9',
      '_TZ3000_lf56vpxj', '_TZ3040_bb6xaihh', '_TZ3040_6ygjfyll',
      '_TZ3210_jijr1sss', '_TZ3210_cwamkvua', '_TZE200_3towulqd',
      // HOBEIAN
      'HOBEIAN'
    ],
    productIds: ['TS0202', 'TS0210', 'ZG-204ZL', 'ZG-204ZV', 'IH012-RT01']
  },

  'contact_sensor': {
    manufacturerIds: [
      '_TZ3000_402jjyro', '_TZ3000_decxrtwa', '_TZ3000_2mbfxlzr',
      '_TZ3000_26fmupbb', '_TZ3000_oxslv1c9', '_TZ3000_au2o5e6q',
      '_TZ3000_bpkijo14', '_TZ3000_rcuyhwe3', '_TZ3000_yfekcy3n',
      '_TZ3000_n2egfsli', '_TZ3000_msl2rxjn', '_TZ3000_hkcpblrs',
      '_TZ3000_bzxloft2', '_TZ3000_xpq2nmkr', '_TZ3000_4ugnzsli'
    ],
    productIds: ['TS0203', 'RH3001', 'DS01', 'DS02', 'IH-K009']
  },

  'presence_sensor': {
    manufacturerIds: [
      // mmWave/Radar presence
      '_TZE200_ztc6ggyl', '_TZE204_ztc6ggyl', '_TZE200_ikvncluo',
      '_TZE204_ikvncluo', '_TZE200_wukb7rhc', '_TZE204_wukb7rhc',
      '_TZE200_jva8ink8', '_TZE204_jva8ink8', '_TZE200_sfiy8puu',
      '_TZE204_sfiy8puu', '_TZE200_holel4dk', '_TZE204_holel4dk',
      '_TZE200_lyetpprm', '_TZE204_lyetpprm', '_TZE200_mrf6vtua',
      '_TZE284_4qznlkbu', '_TZE284_n5q2t8na', '_TZE200_auin8mzr',
      '_TZE204_auin8mzr', '_TZE200_ges7h5mj', '_TZE204_ges7h5mj'
    ],
    productIds: ['TS0601', 'ZY-M100', 'MTG275-ZB-RL', 'ZP-HPS-01', 'HPS-01']
  },

  // ================== PLUGS ==================
  'plug_smart': {
    manufacturerIds: [
      '_TZ3000_kdi2o9m6', '_TZ3000_plyvnuf5', '_TZ3000_g5xawfcq',
      '_TZ3000_okaz9tjs', '_TZ3000_cphmq0q7', '_TZ3000_typdpbpg',
      '_TZ3000_1obwwnmq', '_TZ3000_w0qqde0g', '_TZ3000_vzopcetz',
      '_TZ3000_rdtixbnu', '_TZ3000_2xlvlnvp', '_TZ3000_cymsnfvf',
      '_TZ3000_9hpxg80k', '_TZ3000_wxtp7c5y', '_TZ3000_o005nuxx',
      '_TZ3000_dpo1ysak', '_TZ3000_gjnozsaz', '_TZ3000_cehuw1lw',
      '_TZ3000_upjrxmsr', '_TZ3000_5f43h46r', '_TZ3000_g1pzicmq',
      '_TZ3000_4rbqgcuv', '_TZ3000_1h2x4akh', '_TZ3000_zloso4jk'
    ],
    productIds: ['TS011F', 'TS0121', 'SP-EUC01', 'SP-EUZ01', 'SP-EUR01']
  },

  // ================== BULBS ==================
  'bulb_rgbw': {
    manufacturerIds: [
      '_TZ3000_odygigth', '_TZ3000_49qchf10', '_TZ3000_kdpxju99',
      '_TZ3000_obacbukl', '_TZ3210_sln7ah6r', '_TZ3210_wuheik5l',
      '_TZ3210_alproto2', '_TZ3210_zfblruvv', '_TZ3210_mjas4mds',
      '_TZ3210_it1u8ahz', '_TZ3210_dxrjkpi4', '_TZB210_rkgngb5o',
      '_TZ3210_s1x06gja', '_TZ3210_gs9shyqa', '_TZ3210_wdexaypg',
      '_TZ3210_pagajpog', '_TZ3210_r5afgmkl', '_TZ3210_rwy3hagt'
    ],
    productIds: ['TS0505A', 'TS0505B', 'TS0504B', 'ZB-CL01', 'ZB-TDA9-RCW-E']
  },

  // ================== BUTTONS ==================
  'button_wireless': {
    manufacturerIds: [
      // From Ian Gibbo - TS0601 battery device (possibly button)
      '_TZE284_1lvln0x6',
      // Additional button IDs
      '_TZ3000_bi6lpsew', '_TZ3000_fkvaniuu', '_TZ3000_peszejy7',
      '_TZ3000_wkai4ga5', '_TZ3000_ixla93vd', '_TZ3000_qzjcsmar',
      '_TZ3000_rrjr1q0u', '_TZ3000_abrsvsou', '_TZ3400_keyjhapk',
      '_TZ3400_key8kk7r'
    ],
    productIds: ['TS0041', 'TS0042', 'TS0043', 'TS0044', 'TS004F', 'TS0601']
  },

  // ================== GAS/SMOKE DETECTORS ==================
  'gas_detector': {
    manufacturerIds: [
      '_TZE200_m6kdujme', '_TZE200_5d3vhjro', '_TZE200_auin8mzr',
      '_TZE200_ggev5fsl', '_TZE200_yojqa8xn', '_TZE284_aao6qtcs',
      '_TZE200_rccxox8p', '_TZE200_vzekyi4c', '_TZE200_dq1mfjug',
      '_TZE204_dq1mfjug'
    ],
    productIds: ['TS0601', 'CO-Detector', 'Gas-Detector', 'TS0205']
  },

  'smoke_detector_advanced': {
    manufacturerIds: [
      '_TZE200_ntcy3xu1', '_TZE200_m8iikwas', '_TZE200_dq1mfjug',
      '_TZE200_vzekyi4c', '_TZE204_ntcy3xu1', '_TZ3210_up3pngle',
      '_TYZB01_dsjszp0x', '_TZ3000_ysvspchy'
    ],
    productIds: ['TS0601', 'TS0205', 'SD01', 'SD02']
  },

  // ================== THERMOSTATS/TRV ==================
  'heating_controller_trv': {
    manufacturerIds: [
      '_TZE200_ckud7u2l', '_TZE200_aoclfnxz', '_TZE200_2atgpdho',
      '_TZE200_c88teujp', '_TZE200_ywdxldoj', '_TZE200_cwnjrr72',
      '_TZE200_pvvbommb', '_TZE200_9sfg7gm0', '_TZE200_2ekuz3dz',
      '_TZE204_ckud7u2l', '_TZE204_aoclfnxz', '_TZE284_sgabhwa6'
    ],
    productIds: ['TS0601', 'TRV', 'TV01', 'TV02', 'ME167']
  },

  // ================== HVAC ==================
  'hvac_dehumidifier': {
    manufacturerIds: [
      '_TZE200_oisqyl4o', '_TZE200_myd45weu', '_TZE200_c88teujp',
      '_TZE204_oisqyl4o', '_TZE204_myd45weu'
    ],
    productIds: ['TS0601', 'Dehumidifier']
  },

  'hvac_air_conditioner': {
    manufacturerIds: [
      '_TZE200_ckud7u2l', '_TZE200_zuhszj9s', '_TZE200_husqqvux',
      '_TZE204_ckud7u2l', '_TZE204_zuhszj9s'
    ],
    productIds: ['TS0601', 'IR-AC', 'AC-Controller']
  },

  // ================== LED STRIPS ==================
  'led_strip': {
    manufacturerIds: [
      '_TZ3000_riwp3k79', '_TZ3000_dbou1ap4', '_TZ3000_9cpuaca6',
      '_TZ3000_i8l0nqdu', '_TZ3000_ukuvyhaa', '_TZ3000_qqjaziws',
      '_TZ3000_w58g68s3', '_TZB210_quinzf3w', '_TZB210_aavhaadb'
    ],
    productIds: ['TS0503A', 'TS0503B', 'TS0504B', 'TS0505A', 'TS0505B']
  },

  // ================== WATER/VALVE ==================
  'water_valve': {
    manufacturerIds: [
      '_TZE200_81isopgh', '_TZE200_htnnfasr', '_TZE200_akjefhj5',
      '_TZE200_sh1btabb', '_TZE204_81isopgh', '_TZE200_vrjkcam9',
      '_TZ3000_5f43h46r', '_TZ3000_yz38gdra'
    ],
    productIds: ['TS0601', 'SWV01', 'Valve', 'Water-Valve']
  },

  'water_leak_sensor': {
    manufacturerIds: [
      '_TZ3000_kyb656no', '_TZ3000_mugyhz0q', '_TZ3000_upgcbody',
      '_TZ3000_fxjo6gfe', '_TZ3000_85czd6fy', '_TZ3000_k4ej3ww2',
      '_TZ3000_qdmnmddg', '_TZ3000_kstbkt6a', '_TYZB01_sqmd19i1'
    ],
    productIds: ['TS0207', 'WL01', 'WL02', 'IH-K665']
  },

  // ================== SIRENS ==================
  'siren': {
    manufacturerIds: [
      '_TZ3000_d0yu2xgi', '_TZ3000_fwuelqs5', '_TZE200_d0yu2xgi',
      '_TYZB01_dsjszp0x', '_TZ3000_ab7hfuil', '_TZ3000_xr3htd96'
    ],
    productIds: ['TS0219', 'TS0601', 'Siren', 'SA01']
  },

  // ================== GARAGE/DOOR ==================
  'garage_door_controller': {
    manufacturerIds: [
      '_TZE200_nklqjk62', '_TZE200_wfxuhoea', '_TZE204_nklqjk62',
      '_TZE200_iuk8kupi', '_TZ3000_ycdqsmpd'
    ],
    productIds: ['TS0601', 'GD01', 'Garage-Door']
  },

  // ================== SMART KNOB ==================
  'smart_knob_ts004f': {
    manufacturerIds: [
      '_TZ3000_4fjiwweb', '_TZ3000_uri7ber7', '_TZ3000_ixla93vd',
      '_TZ3000_qja6nq5z', '_TZ3000_abrsvsou', '_TZ3000_csflgqj2',
      '_TZ3000_arfwfgre', '_TZ3000_w8jwkczz', '_TZ3000_kjfzuycl'
    ],
    productIds: ['TS004F', 'ERS-10TZBVK-AA', 'Smart-Knob']
  },

  // ================== DIMMERS ==================
  'dimmer_wireless': {
    manufacturerIds: [
      '_TZ3000_8kzqqzu4', '_TZ3000_qzjcsmar', '_TZ3000_rrjr1q0u',
      '_TZ3000_kdi2o9m6', '_TZ3000_oborybow', '_TZ3000_ja5osu5g'
    ],
    productIds: ['TS0044', 'TS0042', 'TS004F', 'Dimmer-Remote']
  },

  'dimmer_wall_1gang': {
    manufacturerIds: [
      '_TZ3000_7ysdnebc', '_TZ3000_sfc7ztze', '_TZ3000_fjgwfl3z',
      '_TZ3000_sdklhkrs', '_TZ3210_ngqk6jia', '_TZB210_wjz9epjd'
    ],
    productIds: ['TS0101', 'TS0111', 'TS110E', 'TS110F']
  }
};

// =====================================================
// STANDARD FLOW CARDS BY DEVICE TYPE
// =====================================================

const STANDARD_FLOWS = {
  'motion_sensor': {
    triggers: [
      { id: 'alarm_motion_true', title: { en: 'Motion detected', fr: 'Mouvement détecté' } },
      { id: 'alarm_motion_false', title: { en: 'Motion stopped', fr: 'Plus de mouvement' } }
    ],
    conditions: [
      { id: 'alarm_motion', title: { en: 'Motion is detected', fr: 'Mouvement détecté' } }
    ]
  },
  'contact_sensor': {
    triggers: [
      { id: 'alarm_contact_true', title: { en: 'Opened', fr: 'Ouvert' } },
      { id: 'alarm_contact_false', title: { en: 'Closed', fr: 'Fermé' } }
    ],
    conditions: [
      { id: 'alarm_contact', title: { en: 'Is open', fr: 'Est ouvert' } }
    ]
  },
  'plug_smart': {
    triggers: [
      { id: 'onoff_true', title: { en: 'Turned on', fr: 'Allumé' } },
      { id: 'onoff_false', title: { en: 'Turned off', fr: 'Éteint' } },
      { id: 'measure_power_changed', title: { en: 'Power changed', fr: 'Puissance modifiée' } }
    ],
    conditions: [
      { id: 'onoff', title: { en: 'Is on', fr: 'Est allumé' } }
    ],
    actions: [
      { id: 'onoff_true', title: { en: 'Turn on', fr: 'Allumer' } },
      { id: 'onoff_false', title: { en: 'Turn off', fr: 'Éteindre' } }
    ]
  },
  'bulb_rgbw': {
    triggers: [
      { id: 'onoff_true', title: { en: 'Turned on', fr: 'Allumé' } },
      { id: 'onoff_false', title: { en: 'Turned off', fr: 'Éteint' } },
      { id: 'dim_changed', title: { en: 'Brightness changed', fr: 'Luminosité modifiée' } }
    ],
    conditions: [
      { id: 'onoff', title: { en: 'Is on', fr: 'Est allumé' } }
    ],
    actions: [
      { id: 'onoff_true', title: { en: 'Turn on', fr: 'Allumer' } },
      { id: 'onoff_false', title: { en: 'Turn off', fr: 'Éteindre' } },
      { id: 'dim_set', title: { en: 'Set brightness', fr: 'Régler luminosité' } }
    ]
  }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function readDriverConfig(driverName) {
  const configPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    console.log(`  ⚠️  Error reading ${driverName}: ${e.message}`);
    return null;
  }
}

function writeDriverConfig(driverName, config) {
  const configPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

function mergeArrays(target = [], source = []) {
  const set = new Set(target);
  source.forEach(item => set.add(item));
  return Array.from(set);
}

function enrichDriver(driverName, enrichmentData) {
  const config = readDriverConfig(driverName);
  if (!config) {
    console.log(`  ❌ Driver ${driverName} not found`);
    return { added: 0, success: false };
  }

  let addedMfr = 0;
  let addedProd = 0;

  // Ensure zigbee section exists
  if (!config.zigbee) {
    config.zigbee = { manufacturerName: [], productId: [] };
  }

  const beforeMfr = config.zigbee.manufacturerName?.length || 0;
  const beforeProd = config.zigbee.productId?.length || 0;

  if (enrichmentData.manufacturerIds) {
    config.zigbee.manufacturerName = mergeArrays(
      config.zigbee.manufacturerName,
      enrichmentData.manufacturerIds
    );
  }

  if (enrichmentData.productIds) {
    config.zigbee.productId = mergeArrays(
      config.zigbee.productId,
      enrichmentData.productIds
    );
  }

  addedMfr = (config.zigbee.manufacturerName?.length || 0) - beforeMfr;
  addedProd = (config.zigbee.productId?.length || 0) - beforeProd;

  writeDriverConfig(driverName, config);

  return {
    addedMfr,
    addedProd,
    totalMfr: config.zigbee.manufacturerName?.length || 0,
    totalProd: config.zigbee.productId?.length || 0,
    success: true
  };
}

// =====================================================
// MAIN EXECUTION
// =====================================================

function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          🚀 ULTIMATE DRIVER ENRICHMENT SCRIPT               ║');
  console.log('║                                                              ║');
  console.log('║  Sources: GitHub Issues, PRs, Forums, ZHA, Zigbee2mqtt      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let totalDrivers = 0;
  let totalMfrAdded = 0;
  let totalProdAdded = 0;
  let errors = [];

  for (const [driverName, enrichmentData] of Object.entries(ENRICHMENT_DATABASE)) {
    process.stdout.write(`📦 ${driverName.padEnd(30)}`);

    const result = enrichDriver(driverName, enrichmentData);

    if (result.success) {
      if (result.addedMfr > 0 || result.addedProd > 0) {
        console.log(`✅ +${result.addedMfr} mfr, +${result.addedProd} prod (total: ${result.totalMfr}/${result.totalProd})`);
        totalMfrAdded += result.addedMfr;
        totalProdAdded += result.addedProd;
      } else {
        console.log(`⏭️  Already up to date (${result.totalMfr}/${result.totalProd})`);
      }
      totalDrivers++;
    } else {
      console.log(`❌ Not found`);
      errors.push(driverName);
    }
  }

  console.log('\n' + '═'.repeat(66));
  console.log('\n📊 ENRICHMENT SUMMARY:');
  console.log(`   ✅ Drivers processed: ${totalDrivers}`);
  console.log(`   ➕ Manufacturer IDs added: ${totalMfrAdded}`);
  console.log(`   ➕ Product IDs added: ${totalProdAdded}`);

  if (errors.length > 0) {
    console.log(`   ⚠️  Missing drivers: ${errors.join(', ')}`);
  }

  console.log('\n✨ Enrichment complete!');
}

main();
