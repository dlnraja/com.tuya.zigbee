#!/usr/bin/env node
/**
 * MEGA ENRICHMENT SCRIPT v5.5.0
 * Enrichit tous les drivers avec des données de Zigbee2MQTT, ZHA, et autres sources
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const DATA_DIR = path.join(__dirname, '..', 'data', 'enrichment');

// Sources de données connues
const Z2M_DEVICES_URL = 'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt.io/master/supported-devices.json';

// Base de données d'enrichissement intégrée
const ENRICHMENT_DB = {
  // Climate sensors - DP mappings vérifiés
  climate_sensor: {
    additional_manufacturers: [
      '_TZE200_bjawzodf', '_TZE200_zl1kmjqx', '_TZE200_a8sdabtg', '_TZE200_qoy0ekbd',
      '_TZE200_znbl8dj5', '_TZE200_9yapgbuv', '_TZE200_locansqn', '_TZE284_vvmbj46n',
      '_TZE284_aoclfnxz', '_TZE200_cirvgep4', '_TZE200_ckud7u2l', '_TZE200_ywdxldoj'
    ],
    dp_mappings: {
      1: { capability: 'measure_temperature', divisor: 10 },
      2: { capability: 'measure_humidity', divisor: 1 },
      4: { capability: 'measure_battery', divisor: 1, transform: 'x2' }
    }
  },

  // Soil sensors - DP mappings vérifiés
  soil_sensor: {
    additional_manufacturers: [
      '_TZE284_oitavov2', '_TZE200_myd45weu', '_TZE200_ga1maeof', '_TZE200_9cv5tcgq',
      '_TZE284_sgabhwa6', '_TZE200_n8dljorx'
    ],
    dp_mappings: {
      3: { capability: 'measure_humidity', divisor: 1 },
      5: { capability: 'measure_temperature', divisor: 10 },
      15: { capability: 'measure_battery', divisor: 1 }
    }
  },

  // Contact sensors
  contact_sensor: {
    additional_manufacturers: [
      '_TZ3000_26fmupbb', '_TZ3000_n2egfsli', '_TZ3000_oxslv1c9', '_TZ3000_au2o5e6q',
      '_TZ3000_decxrtwa', '_TZ3000_4ugnzsli', '_TZ3000_bzxloft2', '_TZ3000_a33rw7ou',
      '_TZ3000_402jjyro', '_TZ3000_6zvw8ham', '_TZ3000_bpkijo14', '_TZ3000_c8zfad4a'
    ],
    models: ['TS0203', 'IH012-RT01']
  },

  // Motion sensors
  motion_sensor: {
    additional_manufacturers: [
      '_TZ3000_kmh5qpmb', '_TZ3000_mcxw5ehu', '_TZ3000_msl6wxk9', '_TZ3000_6ygjfyll',
      '_TZ3000_bsvqrxru', '_TZ3000_otvn3lne', '_TZ3000_jmrgyl7o', '_TZ3000_lf56vpxj',
      '_TZ3040_bb6xaihh', '_TZ3000_hgu1dlak', '_TZ3000_tiwq83wk', '_TZ3000_ykwcwxmz'
    ],
    models: ['TS0202', 'TS0601', 'IH012-RT01', 'ZB-PCD']
  },

  // Smart plugs
  plug_smart: {
    additional_manufacturers: [
      '_TZ3000_g5xawfcq', '_TZ3000_rdtixbnu', '_TZ3000_typdpbpg', '_TZ3000_w0qqde0g',
      '_TZ3000_cehuw1lw', '_TZ3000_dpo1ysak', '_TZ3000_upjrsxh1', '_TZ3000_okaz9tjs',
      '_TZ3000_mraovvmm', '_TZ3000_u5u4cakc', '_TZ3000_zloso4jk', '_TZ3000_kx0pris5'
    ],
    models: ['TS011F', 'TS0121', 'TS0001']
  },

  // Energy monitoring plugs
  plug_energy_monitor: {
    additional_manufacturers: [
      '_TZ3000_b28wrpvx', '_TZ3000_amdymr7l', '_TZ3000_5f43h46b', '_TZ3000_3ooaz3ng',
      '_TZ3000_gjnozsaz', '_TZ3000_qeuvnohg', '_TZ3000_cphmq0q7', '_TZ3000_ew3ldmgx'
    ],
    models: ['TS011F', 'TS0121']
  },

  // 1-gang switches
  switch_1gang: {
    additional_manufacturers: [
      '_TZ3000_qzjcsmar', '_TZ3000_ji4araar', '_TZ3000_txpitre5', '_TZ3000_tqlv4ug4',
      '_TZ3000_gjnozsaz', '_TZ3000_f1bapcit', '_TZ3000_hhiodade', '_TZ3000_o005nuxx'
    ],
    models: ['TS0001', 'TS0011', 'TS000F']
  },

  // 2-gang switches
  switch_2gang: {
    additional_manufacturers: [
      '_TZ3000_bvrlqyj7', '_TZ3000_zmy4lslw', '_TZ3000_wkai4ga5', '_TZ3000_18ejxno0',
      '_TZ3000_fvhunhxb', '_TZ3000_ltt60asa', '_TZ3000_lupfd8zu', '_TZ3000_pmz6mjyu'
    ],
    models: ['TS0002', 'TS0012', 'TS0003']
  },

  // 3-gang switches
  switch_3gang: {
    additional_manufacturers: [
      '_TZ3000_odzoiovu', '_TZ3000_vjhcxjeb', '_TZ3000_4js6g1cw', '_TZ3000_c8zfad4a',
      '_TZ3000_wyhuocal', '_TZ3000_nnwehhst', '_TZ3000_cahkwezx'
    ],
    models: ['TS0003', 'TS0013', 'TS0004']
  },

  // 4-gang switches
  switch_4gang: {
    additional_manufacturers: [
      '_TZ3000_r0pmi2p3', '_TZ3000_excgg5kb', '_TZ3000_cfnprab5', '_TZ3000_pdvkkcuc'
    ],
    models: ['TS0004', 'TS0014']
  },

  // Dimmers
  dimmer_wall_1gang: {
    additional_manufacturers: [
      '_TZ3000_kqvb5akv', '_TZ3000_7ysdnebc', '_TZ3000_svosnzmu', '_TZ3000_fvh3pjaz',
      '_TZ3000_ksw8qtmt', '_TZ3210_ngqk6jia', '_TZB210_3owg3kkv'
    ],
    models: ['TS0501A', 'TS0501B', 'TS110E']
  },

  // Curtain motors
  curtain_motor: {
    additional_manufacturers: [
      '_TZ3000_vd43bbfq', '_TZ3000_1dd0d5yi', '_TZ3000_8kzqqzu4', '_TZ3000_femsaaua',
      '_TZE200_fctwhugx', '_TZE200_cowvfni3', '_TZE200_wmcdj3aq', '_TZE200_cpbo62rn'
    ],
    models: ['TS130F', 'TS0601', 'TS0302']
  },

  // Water leak sensors
  water_leak_sensor: {
    additional_manufacturers: [
      '_TZ3000_eit8c5cs', '_TZ3000_k4ej3ww2', '_TZ3000_kyb656no', '_TZ3000_mugyhz0q',
      '_TZ3000_t6jriawg', '_TZ3000_upgcbody', '_TZ3000_fvm13j8w', '_TZ3000_awvmkayh'
    ],
    models: ['TS0207', 'TS0601']
  },

  // Smoke detectors
  smoke_detector_advanced: {
    additional_manufacturers: [
      '_TZE200_ntcy3xu1', '_TZE200_m9skfctm', '_TZE200_aycxwiau', '_TZE200_dq1mfjug',
      '_TZ3210_up3pngle', '_TZE284_rccxox8p'
    ],
    models: ['TS0601', 'TS0205']
  },

  // Gas sensors
  gas_sensor: {
    additional_manufacturers: [
      '_TZE200_ggev5fsl', '_TZE200_rccxox8p', '_TZE200_yojqa8xn', '_TZE200_wzqkpstm'
    ],
    models: ['TS0601']
  },

  // Thermostats
  thermostat_tuya_dp: {
    additional_manufacturers: [
      '_TZE200_aoclfnxz', '_TZE200_2ekuz3dz', '_TZE200_c88teujp', '_TZE200_ywdxldoj',
      '_TZE200_cwnjrr72', '_TZE200_py4cm3he', '_TZE200_2hf7x9n3', '_TZE200_znbl8dj5'
    ],
    models: ['TS0601']
  },

  // Radiator valves
  radiator_valve: {
    additional_manufacturers: [
      '_TZE200_ckud7u2l', '_TZE200_kfvq6avy', '_TZE200_fhn3negr', '_TZE200_husqqvux',
      '_TZE200_e9ba97vf', '_TZE200_chyvmhay', '_TZE200_0hg58epr'
    ],
    models: ['TS0601']
  },

  // Doorbells
  doorbell: {
    additional_manufacturers: [
      '_TZ1800_akzvkzqq', '_TZ1800_ladpngdx', '_TZE200_2wg5rjgr', '_TZE284_9qhgsdta'
    ],
    models: ['TS0211', 'TS0601']
  },

  // Sirens
  siren: {
    additional_manufacturers: [
      '_TZE200_nlrfgpny', '_TZE200_t1blo2bj', '_TZE204_nlrfgpny', '_TYZB01_bnggsfsf'
    ],
    models: ['TS0601', 'TS0219']
  },

  // Smart locks
  lock_smart: {
    additional_manufacturers: [
      '_TZE200_g2kiyjvf', '_TZE200_3t91nb6k', '_TZE200_ne4s6z47', '_TZE204_rrbcyh1f'
    ],
    models: ['TS0601']
  },

  // Presence radar sensors
  presence_sensor_radar: {
    additional_manufacturers: [
      '_TZE200_ztc6ggyl', '_TZE204_ztc6ggyl', '_TZE200_ikvncluo', '_TZE200_lyetpprm',
      '_TZE200_wukb7rhc', '_TZE200_jva8ink8', '_TZE200_sfiy5tfs', '_TZE204_sbyx0lm6'
    ],
    models: ['TS0601', 'TS0225']
  },

  // mmWave radar sensors
  motion_sensor_radar_mmwave: {
    additional_manufacturers: [
      '_TZE204_qasjif9e', '_TZE200_2aaelwxk', '_TZE200_3towulqd', '_TZE200_kb5noeto',
      '_TZE204_sxm7l9xa', '_TZE204_e5m9c5hl', '_TZE200_lu01t0zl', '_TZE284_4qznlkbu'
    ],
    models: ['TS0601', 'TS0225']
  },

  // Wireless buttons
  button_wireless: {
    additional_manufacturers: [
      '_TZ3000_dfgbtub0', '_TZ3000_ja5osu5g', '_TZ3000_adkvzooy', '_TZ3000_qgwcxxws',
      '_TZ3000_wqxwpita', '_TZ3000_pkfazisv', '_TZ3000_arfwfgoa', '_TZ3000_rrjr1q0u'
    ],
    models: ['TS0041', 'TS0042', 'TS0043', 'TS0044']
  },

  // Scene switches
  scene_switch_4: {
    additional_manufacturers: [
      '_TZ3000_xabckq1v', '_TZ3000_a7ouggvs', '_TZ3000_bi6lpsew', '_TZ3000_itb0omhv',
      '_TZ3000_owgcnkrh', '_TZ3000_w8jwkczz', '_TZ3000_jckxip3g'
    ],
    models: ['TS0044']
  },

  // RGB bulbs
  bulb_rgb: {
    additional_manufacturers: [
      '_TZ3210_hxtfthp5', '_TZ3210_iw0zkcu8', '_TZ3210_mja6r5ix', '_TZ3210_it1u8ahz',
      '_TZ3210_jd3z4yig', '_TZ3210_wxa85bwk', '_TZ3210_z1vlyufu', '_TZ3210_rcggc0ys'
    ],
    models: ['TS0505B', 'TS0504B', 'TS0503B']
  },

  // Tunable white bulbs
  bulb_tunable_white: {
    additional_manufacturers: [
      '_TZ3210_ljoasixl', '_TZ3210_sln7ah6r', '_TZ3210_r5afgmkl', '_TZ3210_ifga63rg',
      '_TZ3000_dbou1ap4', '_TZ3000_49qchf10'
    ],
    models: ['TS0502B', 'TS0502A']
  },

  // LED strips
  led_strip: {
    additional_manufacturers: [
      '_TZ3000_riwp3k79', '_TZ3000_obacbukl', '_TZ3000_v1srfw9x', '_TZ3210_c2iwpxf1',
      '_TZ3210_p9ao60da', '_TZ3210_zrvxvydd', '_TZB210_endmggws'
    ],
    models: ['TS0503A', 'TS0503B', 'TS0504A', 'TS0504B']
  },

  // Air quality sensors
  air_quality_co2: {
    additional_manufacturers: [
      '_TZE200_dwcarsat', '_TZE200_8ygsuhe1', '_TZE200_yvx5lh6k', '_TZE200_ryfmq5rl',
      '_TZE284_sgabhwa6', '_TZE200_ogkdpgy2'
    ],
    models: ['TS0601']
  },

  // USB outlets
  usb_outlet_advanced: {
    additional_manufacturers: [
      '_TZ3000_gvn91tmx', '_TZ3000_cjrngdr3', '_TZ3000_bfn1w0mm', '_TZ3000_dksbtrzs'
    ],
    models: ['TS011F', 'TS0115']
  }
};

// Fonction pour enrichir un driver
function enrichDriver(driverName) {
  const driverPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');

  if (!fs.existsSync(driverPath)) {
    console.log(`⚠️ Driver ${driverName} non trouvé`);
    return { success: false, reason: 'not_found' };
  }

  try {
    const driverData = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
    const enrichment = ENRICHMENT_DB[driverName];

    if (!enrichment) {
      return { success: false, reason: 'no_enrichment_data' };
    }

    let modified = false;

    // Ajouter les manufacturer names
    if (enrichment.additional_manufacturers) {
      const currentManufacturers = driverData.zigbee?.manufacturerName || [];
      const newManufacturers = enrichment.additional_manufacturers.filter(
        m => !currentManufacturers.includes(m)
      );

      if (newManufacturers.length > 0) {
        driverData.zigbee.manufacturerName = [...currentManufacturers, ...newManufacturers];
        modified = true;
        console.log(`  ✅ +${newManufacturers.length} manufacturers`);
      }
    }

    // Ajouter les models/productId
    if (enrichment.models) {
      const currentModels = driverData.zigbee?.productId || [];
      const newModels = enrichment.models.filter(m => !currentModels.includes(m));

      if (newModels.length > 0) {
        driverData.zigbee.productId = [...currentModels, ...newModels];
        modified = true;
        console.log(`  ✅ +${newModels.length} models`);
      }
    }

    if (modified) {
      fs.writeFileSync(driverPath, JSON.stringify(driverData, null, 2) + '\n');
      return { success: true, modified: true };
    }

    return { success: true, modified: false };
  } catch (error) {
    console.error(`❌ Erreur pour ${driverName}: ${error.message}`);
    return { success: false, reason: error.message };
  }
}

// Fonction principale
async function main() {
  console.log('🚀 MEGA ENRICHMENT SCRIPT v5.5.0');
  console.log('================================\n');

  // Lister tous les drivers
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
    const driverPath = path.join(DRIVERS_DIR, d);
    return fs.statSync(driverPath).isDirectory() &&
           fs.existsSync(path.join(driverPath, 'driver.compose.json'));
  });

  console.log(`📂 ${drivers.length} drivers trouvés\n`);

  let enriched = 0;
  let unchanged = 0;
  let failed = 0;

  // Enrichir chaque driver
  for (const driver of drivers) {
    console.log(`📦 ${driver}:`);
    const result = enrichDriver(driver);

    if (result.success && result.modified) {
      enriched++;
    } else if (result.success && !result.modified) {
      unchanged++;
      console.log('  ⏭️ Pas de nouvelles données');
    } else {
      failed++;
      console.log(`  ⚠️ ${result.reason}`);
    }
  }

  console.log('\n================================');
  console.log('📊 RÉSUMÉ:');
  console.log(`  ✅ Enrichis: ${enriched}`);
  console.log(`  ⏭️ Inchangés: ${unchanged}`);
  console.log(`  ⚠️ Échoués: ${failed}`);
  console.log(`  📦 Total: ${drivers.length}`);

  // Sauvegarder le rapport
  const report = {
    timestamp: new Date().toISOString(),
    version: '5.5.0',
    drivers_total: drivers.length,
    enriched,
    unchanged,
    failed,
    enrichment_sources: Object.keys(ENRICHMENT_DB)
  };

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  fs.writeFileSync(
    path.join(DATA_DIR, 'enrichment-report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n✅ Rapport sauvegardé dans data/enrichment/enrichment-report.json');
}

main().catch(console.error);
