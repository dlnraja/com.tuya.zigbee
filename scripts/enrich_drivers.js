'use strict';

/**
 * Script to enrich drivers with comprehensive manufacturer IDs
 * Based on community reports, ZHA, zigbee2mqtt databases
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// Comprehensive manufacturer ID database by category
const ENRICHMENT_DB = {
  // MOTION SENSORS
  'motion_sensor': {
    manufacturerIds: [
      // Tuya Generic
      '_TZ3000_mcxw5ehu', '_TZ3000_6ygjfyll', '_TZ3000_kmh5qpmb', '_TZ3000_msl6wxk9',
      '_TZ3000_otvn3lne', '_TZ3000_pirddkfc', '_TZ3000_bsvqrxru', '_TZ3000_1obwwnmq',
      '_TZ3000_nss8amz9', '_TZ3000_lf56vpxj', '_TZ3040_bb6xaihh', '_TZ3040_6ygjfyll',
      '_TZ3210_jijr1sss', '_TZ3210_cwamkvua', '_TZE200_3towulqd', '_TZE200_bh3n6gk8',
      // Xiaomi/Aqara/Lumi
      'LUMI', 'lumi', 'Xiaomi', 'aqara',
      // Philips Hue
      'Philips', 'Signify Netherlands B.V.',
      // IKEA
      'IKEA of Sweden', 'IKEA',
      // Lidl/Silvercrest
      'LIDL Silvercrest', 'Silvercrest',
      // Nous/LSC
      'Nous', 'LSC', '_TZ3000_h4wnrtck'
    ],
    productIds: [
      'TS0202', 'TS0601', 'TS0210',
      'lumi.sensor_motion', 'lumi.sensor_motion.aq2', 'RTCGQ11LM', 'RTCGQ01LM',
      'SML001', 'SML002', 'SML003', 'SML004',
      'TRADFRI motion sensor', 'E1525', 'E1745',
      'HG06335', 'HG08164', 'ZP-PIR-03'
    ]
  },

  // CONTACT SENSORS
  'contact_sensor': {
    manufacturerIds: [
      // Tuya Generic
      '_TZ3000_402jjyro', '_TZ3000_decxrtwa', '_TZ3000_2mbfxlzr', '_TZ3000_26fmupbb',
      '_TZ3000_oxslv1c9', '_TZ3000_au2o5e6q', '_TZ3000_bpkijo14', '_TZ3000_rcuyhwe3',
      '_TZ3000_yfekcy3n', '_TZ3000_n2egfsli', '_TZ3000_msl2rxjn', '_TZ3000_hkcpblrs',
      '_TZ3000_fllyghyj', '_TZ3000_uvti8nkd', '_TZ3000_hgu1dlak', '_TZ3000_0hkmcrza',
      // Xiaomi/Aqara/Lumi
      'LUMI', 'lumi', 'Xiaomi', 'aqara',
      // Shelly
      'Shelly', 'Allterco',
      // Lidl/Silvercrest
      'LIDL Silvercrest', 'Silvercrest',
      // Nous/LSC
      'Nous', 'LSC'
    ],
    productIds: [
      'TS0203', 'RH3001', 'TY0203', 'DS01',
      'lumi.sensor_magnet', 'lumi.sensor_magnet.aq2', 'MCCGQ11LM', 'MCCGQ01LM',
      'SHDW-1', 'SHDW-2', 'HG06336', 'ZP-DW-03'
    ]
  },

  // SMART PLUGS
  'plug_smart': {
    manufacturerIds: [
      // Tuya Generic
      '_TZ3000_kdi2o9m6', '_TZ3000_plyvnuf5', '_TZ3000_g5xawfcq', '_TZ3000_okaz9tjs',
      '_TZ3000_cphmq0q7', '_TZ3000_typdpbpg', '_TZ3000_1obwwnmq', '_TZ3000_w0qqde0g',
      '_TZ3000_vzopcetz', '_TZ3000_rdtixbnu', '_TZ3000_2xlvlnvp', '_TZ3000_cymsnfvf',
      '_TZ3000_9hpxg80k', '_TZ3000_wxtp7c5y', '_TZ3000_o005nuxx', '_TZ3000_ksw8qtmt',
      '_TZ3000_7ysdnebc', '_TZ3000_dpo1ysak', '_TZ3000_gjnozsaz', '_TZ3000_8nkb7mof',
      '_TZ3000_wamqdr3f', '_TZ3000_00mk2xzy', '_TZ3000_cehuw1lw', '_TZ3000_ltt60asa',
      // BlitzWolf
      'BlitzWolf',
      // Nous/LSC
      'Nous', 'LSC', '_TZ3000_b28wrpvx',
      // Lidl/Silvercrest
      'LIDL Silvercrest', 'Silvercrest',
      // SONOFF
      'SONOFF', 'eWeLink'
    ],
    productIds: [
      'TS011F', 'TS0121', 'TS0001', 'S26R2ZB',
      'HG06337', 'HG06338', 'HG08673',
      'BW-SHP13', 'BW-SHP15',
      'BASICZBR3', 'S31ZB', 'SP-EUC01',
      'ZP-SP-01', 'A1Z', 'A3Z', 'A4Z'
    ]
  },

  // RGB/RGBW BULBS
  'bulb_rgbw': {
    manufacturerIds: [
      // Tuya Generic
      '_TZ3000_odygigth', '_TZ3000_49qchf10', '_TZ3000_kdpxju99', '_TZ3000_obacbukl',
      '_TZ3210_sln7ah6r', '_TZ3210_wuheik5l', '_TZ3210_alproto2', '_TZ3210_zfblruvv',
      '_TZ3210_mjas4mds', '_TZ3210_it1u8ahz', '_TZ3210_dxrjkpi4', '_TZB210_rkgngb5o',
      // Philips Hue
      'Philips', 'Signify Netherlands B.V.',
      // IKEA
      'IKEA of Sweden', 'IKEA',
      // Lidl/Silvercrest
      'LIDL Silvercrest', 'Silvercrest',
      // Innr
      'innr', 'Innr',
      // OSRAM/Ledvance
      'OSRAM', 'LEDVANCE'
    ],
    productIds: [
      'TS0505A', 'TS0505B', 'TS0502A', 'TS0502B', 'ZB-CL01',
      'LCT001', 'LCT007', 'LCT010', 'LCT014', 'LCT015', 'LCT016', 'LCA001', 'LCA002', 'LCA003',
      'TRADFRI bulb E27 CWS opal 600lm', 'TRADFRI bulb E14 WS opal 400lm', 'LED1624G9', 'LED1649C5',
      'HG06106A', 'HG06106B', 'HG06106C', 'HG06492A', 'HG06492B', 'HG06492C', 'HG06467', 'HG07834A', 'HG07834B',
      'RB 285 C', 'RB 250 C', 'Classic A60 RGBW'
    ]
  },

  // CLIMATE SENSORS
  'climate_sensor': {
    manufacturerIds: [
      // Tuya Generic
      '_TZ3000_xr3htd96', '_TZ3000_qaaysllp', '_TZ3000_fllyghyj', '_TZ3000_yd2e749y',
      '_TZ3000_6uzkisv2', '_TZ3000_dowj6gyi', '_TZ2000_a476raq2', '_TZE200_dwcarsat',
      '_TZE200_zl1kmjqx', '_TZE200_locansqn', '_TZE200_bq5c8xfe', '_TZE200_pisltm67',
      // Xiaomi/Aqara/Lumi
      'LUMI', 'lumi', 'Xiaomi', 'aqara',
      // Nous
      'Nous'
    ],
    productIds: [
      'TS0201', 'TS0601', 'TH01', 'RSH-TH01',
      'lumi.weather', 'lumi.sensor_ht', 'WSDCGQ11LM', 'WSDCGQ01LM',
      'ZTH01', 'ZTH02'
    ]
  },

  // PRESENCE SENSORS (RADAR/mmWave)
  'presence_sensor': {
    manufacturerIds: [
      // Tuya mmWave
      '_TZE200_ztc6ggyl', '_TZE204_ztc6ggyl', '_TZE200_ikvncluo', '_TZE204_ikvncluo',
      '_TZE200_wukb7rhc', '_TZE204_wukb7rhc', '_TZE200_jva8ink8', '_TZE204_jva8ink8',
      '_TZE200_sfiy8puu', '_TZE204_sfiy8puu', '_TZE200_holel4dk', '_TZE204_holel4dk',
      '_TZE200_lyetpprm', '_TZE204_lyetpprm', '_TZE200_mrf6vtua', '_TZE204_mrf6vtua',
      '_TZE284_4qznlkbu', '_TZE284_n5q2t8na',
      // Xiaomi/Aqara
      'LUMI', 'lumi', 'aqara'
    ],
    productIds: [
      'TS0601', 'ZY-M100', 'MTG275-ZB-RL', 'ZP-HPS-01',
      'lumi.motion.agl001', 'RTCZCGQ11LM'
    ]
  },

  // SMART KNOB / ROTARY
  'smart_knob_ts004f': {
    manufacturerIds: [
      '_TZ3000_4fjiwweb', '_TZ3000_uri7ber7', '_TZ3000_ixla93vd', '_TZ3000_qja6nq5z',
      '_TZ3000_abrsvsou', '_TZ3000_csflgqj2', '_TZ3000_arfwfgre', 'MOES', 'TuYa'
    ],
    productIds: ['TS004F', 'ERS-10TZBVK-AA', 'Smart Knob']
  },

  // SWITCHES
  'switch_smart_1gang': {
    manufacturerIds: [
      '_TZ3000_7ysdnebc', '_TZ3000_ksw8qtmt', '_TZ3000_txpitre5', '_TZ3000_zmy4lslw',
      '_TZ3000_tqlv4ez4', '_TZ3000_4uf3d0ax', '_TZ3000_pmvbt5hh', '_TZ3000_npzfdcof',
      '_TZ3000_hktqahrq', '_TZ3000_mx3vgyea', '_TZ3000_46t1rvdu', '_TZ3000_5ng23zjs',
      // Zemismart
      'Zemismart',
      // Shelly
      'Shelly', 'Allterco',
      // SONOFF
      'SONOFF', 'eWeLink'
    ],
    productIds: [
      'TS0001', 'TS0011', 'ZM-CSW002-D',
      'SHSW-1', 'Shelly1',
      'BASICZBR3', 'ZBMINI', 'ZBMINIL2'
    ]
  },

  // GAS DETECTOR
  'gas_detector': {
    manufacturerIds: [
      '_TZE200_m6kdujme', '_TZE200_5d3vhjro', '_TZE200_auin8mzr', '_TZE200_ggev5fsl',
      '_TZE200_yojqa8xn', '_TZE284_aao6qtcs', 'MOES', 'TuYa'
    ],
    productIds: ['TS0601', 'CO-Detector', 'Gas-Detector', 'CO2-Sensor']
  },

  // DIMMER WIRELESS
  'dimmer_wireless': {
    manufacturerIds: [
      '_TZ3000_8kzqqzu4', '_TZ3000_qzjcsmar', '_TZ3000_rrjr1q0u',
      'Philips', 'Signify Netherlands B.V.',
      'IKEA of Sweden', 'IKEA'
    ],
    productIds: [
      'TS0044', 'TS0042',
      'RWL020', 'RWL021', 'RWL022',
      'TRADFRI remote control', 'E1524', 'E1812'
    ]
  }
};

function readDriverConfig(driverName) {
  const configPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  if (!fs.existsSync(configPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function writeDriverConfig(driverName, config) {
  const configPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

function mergeArrays(target, source) {
  const set = new Set(target);
  source.forEach(item => set.add(item));
  return Array.from(set);
}

function enrichDriver(driverName, enrichmentData) {
  const config = readDriverConfig(driverName);
  if (!config) {
    console.log(`❌ Driver ${driverName} not found`);
    return false;
  }

  const beforeMfr = config.zigbee?.manufacturerName?.length || 0;
  const beforeProd = config.zigbee?.productId?.length || 0;

  if (config.zigbee && enrichmentData.manufacturerIds) {
    config.zigbee.manufacturerName = mergeArrays(
      config.zigbee.manufacturerName || [],
      enrichmentData.manufacturerIds
    );
  }

  if (config.zigbee && enrichmentData.productIds) {
    config.zigbee.productId = mergeArrays(
      config.zigbee.productId || [],
      enrichmentData.productIds
    );
  }

  const afterMfr = config.zigbee?.manufacturerName?.length || 0;
  const afterProd = config.zigbee?.productId?.length || 0;

  writeDriverConfig(driverName, config);

  const addedMfr = afterMfr - beforeMfr;
  const addedProd = afterProd - beforeProd;

  if (addedMfr > 0 || addedProd > 0) {
    console.log(`✅ ${driverName}: +${addedMfr} mfr IDs, +${addedProd} product IDs (total: ${afterMfr}/${afterProd})`);
    return true;
  } else {
    console.log(`⏭️  ${driverName}: already up to date (${afterMfr}/${afterProd})`);
    return false;
  }
}

function main() {
  console.log('🔄 ENRICHING DRIVERS WITH MANUFACTURER IDs\n');
  console.log('='.repeat(60));

  let enriched = 0;
  let skipped = 0;

  for (const [driverName, enrichmentData] of Object.entries(ENRICHMENT_DB)) {
    if (enrichDriver(driverName, enrichmentData)) {
      enriched++;
    } else {
      skipped++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 SUMMARY:`);
  console.log(`   ✅ Enriched: ${enriched} drivers`);
  console.log(`   ⏭️  Already up to date: ${skipped}`);
  console.log('\n✨ Done! Drivers enriched with comprehensive manufacturer IDs.');
}

main();
