#!/usr/bin/env node
/**
 * MEGA TS0601 ENRICHMENT SCRIPT
 *
 * Enrichit TOUS les drivers avec les manufacturer IDs complets depuis:
 * - Zigbee2MQTT (z2m-tuya-parsed.json)
 * - Blakadder database
 * - ZHA quirks
 * - Johan Bendz contributions
 * - Forum Homey Community
 *
 * Catégorise par type de device et enrichit les bons drivers.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(PROJECT_ROOT, 'drivers');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');

// Mapping des types vers drivers
const DRIVER_MAPPING = {
  // Climate & Temperature
  'climate_sensor': ['climate_sensor', 'soil_sensor', 'weather_station_outdoor'],
  'temperature': ['climate_sensor'],
  'humidity': ['climate_sensor'],
  'soil': ['soil_sensor'],

  // Motion & Presence
  'motion_sensor': ['motion_sensor', 'motion_sensor_radar_mmwave'],
  'presence': ['presence_sensor_radar', 'motion_sensor_radar_mmwave'],
  'radar': ['presence_sensor_radar', 'motion_sensor_radar_mmwave'],
  'pir': ['motion_sensor'],

  // Switches
  'switch_1gang': ['switch_1gang'],
  'switch_2gang': ['switch_2gang'],
  'switch_3gang': ['switch_3gang'],
  'switch_4gang': ['switch_4gang'],
  'switch': ['switch_1gang', 'switch_2gang', 'switch_3gang'],

  // Dimmers
  'dimmer_wall_1gang': ['dimmer_wall_1gang', 'dimmer_dual_channel'],
  'dimmer': ['dimmer_wall_1gang', 'dimmer_dual_channel'],

  // Plugs & Energy
  'plug': ['plug_smart', 'plug_energy_monitor'],
  'socket': ['plug_smart', 'plug_energy_monitor', 'usb_outlet_advanced'],
  'energy': ['plug_energy_monitor', 'power_meter', 'energy_meter_3phase'],

  // Curtains & Covers
  'curtain': ['curtain_motor', 'curtain_motor_tilt', 'shutter_roller_controller'],
  'cover': ['curtain_motor', 'shutter_roller_controller'],
  'blind': ['curtain_motor_tilt'],

  // Thermostats & HVAC
  'thermostat': ['thermostat_tuya_dp', 'thermostat_4ch', 'radiator_valve'],
  'trv': ['radiator_valve'],
  'hvac': ['hvac_air_conditioner', 'hvac_dehumidifier'],

  // Sensors
  'contact': ['contact_sensor'],
  'door': ['contact_sensor', 'door_controller'],
  'window': ['contact_sensor'],
  'water_leak': ['water_leak_sensor'],
  'water_valve': ['water_valve_smart', 'valve_irrigation'],
  'gas': ['gas_sensor', 'gas_detector'],
  'smoke': ['smoke_detector_advanced'],
  'co': ['co_sensor'],
  'air_quality': ['air_quality_comprehensive', 'air_quality_co2', 'formaldehyde_sensor'],

  // Lighting
  'bulb': ['bulb_rgb', 'bulb_rgbw', 'bulb_dimmable', 'bulb_white', 'bulb_tunable_white'],
  'light': ['bulb_rgb', 'led_strip', 'led_strip_advanced'],
  'led': ['led_strip', 'led_strip_advanced', 'led_strip_rgbw', 'led_controller_rgb', 'led_controller_cct'],
  'rgb': ['bulb_rgb', 'bulb_rgbw', 'led_strip_rgbw'],

  // Buttons & Remotes
  'button': ['button_wireless', 'button_wireless_1', 'button_wireless_2', 'button_wireless_3', 'button_wireless_4'],
  'remote': ['button_wireless_4', 'button_wireless_6', 'button_wireless_8'],
  'scene': ['scene_switch_1', 'scene_switch_2'],

  // Other
  'siren': ['siren'],
  'lock': ['lock_smart'],
  'fan': ['ceiling_fan'],
  'doorbell': ['doorbell'],
  'gateway': ['gateway_zigbee_bridge'],
  'generic': ['generic_tuya', 'zigbee_universal']
};

// Catégories par keywords dans description/manufacturer
const CATEGORY_KEYWORDS = {
  'temperature': ['temperature', 'temp', 'thermometer', 'climate'],
  'humidity': ['humidity', 'hygrometer', 'moisture'],
  'soil': ['soil', 'plant', 'moisture sensor'],
  'motion': ['motion', 'pir', 'occupancy'],
  'presence': ['presence', 'radar', 'mmwave', 'human presence'],
  'switch': ['switch', 'relay', 'gang switch'],
  'dimmer': ['dimmer', 'brightness', 'dim module'],
  'plug': ['plug', 'socket', 'outlet', 'power socket'],
  'curtain': ['curtain', 'cover', 'blind', 'roller', 'shutter', 'motor'],
  'thermostat': ['thermostat', 'heating', 'trv', 'radiator', 'valve'],
  'contact': ['contact', 'door sensor', 'window sensor', 'open/close'],
  'water': ['water', 'leak', 'flood'],
  'gas': ['gas', 'lpg', 'methane', 'combustible'],
  'smoke': ['smoke', 'fire'],
  'co': ['carbon monoxide', 'co detector', 'co sensor'],
  'air': ['air quality', 'co2', 'voc', 'pm2.5', 'formaldehyde'],
  'bulb': ['bulb', 'lamp', 'light bulb'],
  'led': ['led', 'strip', 'controller'],
  'button': ['button', 'remote', 'switch button', 'scene'],
  'siren': ['siren', 'alarm', 'sound'],
  'lock': ['lock', 'door lock', 'smart lock'],
  'fan': ['fan', 'ceiling fan', 'ventilation']
};

console.log('🚀 MEGA TS0601 ENRICHMENT SCRIPT');
console.log('================================\n');

// Charger les données Z2M
function loadZ2MData() {
  const z2mPath = path.join(DATA_DIR, 'enrichment', 'z2m-tuya-parsed.json');
  if (fs.existsSync(z2mPath)) {
    const data = JSON.parse(fs.readFileSync(z2mPath, 'utf8'));
    console.log(`✅ Chargé ${data.devices?.length || 0} devices Z2M`);
    return data.devices || [];
  }
  console.log('⚠️ Fichier Z2M non trouvé');
  return [];
}

// Charger autres sources
function loadAdditionalSources() {
  const sources = [];

  // Blakadder
  const blakadderPath = path.join(DATA_DIR, 'enrichment', 'blakadder-complete-report.json');
  if (fs.existsSync(blakadderPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(blakadderPath, 'utf8'));
      if (data.devices) sources.push(...data.devices);
      console.log(`✅ Chargé ${data.devices?.length || 0} devices Blakadder`);
    } catch(e) {}
  }

  // Complete device database
  const completeDbPath = path.join(DATA_DIR, 'enrichment', 'complete-device-database.json');
  if (fs.existsSync(completeDbPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(completeDbPath, 'utf8'));
      if (data.devices) sources.push(...data.devices);
      console.log(`✅ Chargé ${data.devices?.length || 0} devices complete-db`);
    } catch(e) {}
  }

  return sources;
}

// Déterminer la catégorie d'un device
function categorizeDevice(device) {
  const desc = (device.description || '').toLowerCase();
  const mfr = (device.manufacturerId || '').toLowerCase();
  const recommended = device.recommendedDriver || '';

  // Si recommendedDriver est défini et valide
  if (recommended && recommended !== 'unknown') {
    return recommended;
  }

  // Analyse par keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (desc.includes(kw) || mfr.includes(kw)) {
        return category;
      }
    }
  }

  // Patterns manufacturer ID spécifiques
  if (mfr.includes('_tze200_') || mfr.includes('_tze204_') || mfr.includes('_tze284_')) {
    // TS0601 Tuya DP devices - analyser le suffixe
    // Climate sensors patterns courants
    const climateSuffixes = ['vuwtqx0t', 'qyflbnbj', 'bjawzodf', 'yjjdcqsq', '9yapgbuv', 'utkemkbs'];
    const suffix = mfr.slice(-8);
    if (climateSuffixes.some(s => suffix.includes(s))) {
      return 'climate_sensor';
    }
  }

  return 'generic';
}

// Enrichir un driver avec des manufacturer IDs
function enrichDriver(driverId, manufacturerIds) {
  const driverPath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');

  if (!fs.existsSync(driverPath)) {
    console.log(`  ⚠️ Driver ${driverId} non trouvé`);
    return false;
  }

  try {
    const driver = JSON.parse(fs.readFileSync(driverPath, 'utf8'));

    // Get existing manufacturer names
    let existingNames = [];
    if (driver.zigbee?.manufacturerName) {
      existingNames = Array.isArray(driver.zigbee.manufacturerName)
        ? driver.zigbee.manufacturerName
        : [driver.zigbee.manufacturerName];
    }

    // Merge with new IDs (unique, sorted)
    const allNames = [...new Set([...existingNames, ...manufacturerIds])].sort();

    // Filter out placeholder/wildcard IDs
    const validNames = allNames.filter(id =>
      id &&
      !id.includes('unknown') &&
      !id.endsWith('_') &&
      id.length >= 8
    );

    if (validNames.length === existingNames.length) {
      return false; // No new IDs added
    }

    // Update driver
    if (!driver.zigbee) driver.zigbee = {};
    driver.zigbee.manufacturerName = validNames;

    fs.writeFileSync(driverPath, JSON.stringify(driver, null, 2) + '\n');
    console.log(`  ✅ ${driverId}: +${validNames.length - existingNames.length} IDs (total: ${validNames.length})`);
    return true;
  } catch(e) {
    console.log(`  ❌ Erreur ${driverId}: ${e.message}`);
    return false;
  }
}

// Main
async function main() {
  // Load all sources
  const z2mDevices = loadZ2MData();
  const additionalDevices = loadAdditionalSources();
  const allDevices = [...z2mDevices, ...additionalDevices];

  console.log(`\n📊 Total: ${allDevices.length} devices à traiter\n`);

  // Categorize and group by driver
  const driverIds = {};

  for (const device of allDevices) {
    const category = categorizeDevice(device);
    const targetDrivers = DRIVER_MAPPING[category] || DRIVER_MAPPING['generic'];
    const manufacturerId = device.manufacturerId || device.manufacturerName;

    if (!manufacturerId) continue;

    // Normalize manufacturer ID (uppercase prefix)
    const normalizedId = manufacturerId.replace(/^_TZ/i, '_TZ').replace(/^_tz/i, '_TZ');

    for (const driverId of targetDrivers) {
      if (!driverIds[driverId]) {
        driverIds[driverId] = new Set();
      }
      driverIds[driverId].add(normalizedId);
    }
  }

  console.log(`📁 Drivers à enrichir: ${Object.keys(driverIds).length}\n`);

  // Enrich each driver
  let enrichedCount = 0;
  let totalNewIds = 0;

  for (const [driverId, ids] of Object.entries(driverIds)) {
    const idArray = Array.from(ids);
    if (enrichDriver(driverId, idArray)) {
      enrichedCount++;
      totalNewIds += idArray.length;
    }
  }

  // Additional TS0601 specific enrichments (hardcoded from research)
  console.log('\n🔧 Enrichissements TS0601 spécifiques...\n');

  const ts0601Enrichments = {
    'climate_sensor': [
      '_TZE200_bjawzodf', '_TZE200_qyflbnbj', '_TZE200_yjjdcqsq', '_TZE200_9yapgbuv',
      '_TZE200_utkemkbs', '_TZE204_utkemkbs', '_TZE284_utkemkbs', '_TZE200_cirvgep4',
      '_TZE204_cirvgep4', '_TZE200_upagmta9', '_TZE204_upagmta9', '_TZE284_upagmta9',
      '_TZE200_d7lpruvi', '_TZE204_d7lpruvi', '_TZE284_d7lpruvi', '_TZE200_vuwtqx0t',
      '_TZE284_vuwtqx0t', '_TZE200_bq5c8xfe', '_TZE200_44af8vyi', '_TZE200_zl1kmjqx',
      '_TZE200_mfamvsdb', '_TZE200_dhke3p9w', '_TZE284_dhke3p9w', '_TZE200_vvmbj46n',
      '_TZE284_vvmbj46n', '_TZE200_nvups4nh', '_TZE200_8ygsuhe1', '_TZE200_yvx5lh6k',
      '_TZE204_yvx5lh6k', '_TZE200_c2fmom5z', '_TZE204_c2fmom5z', '_TZE200_mja3fuja',
      '_TZE200_rbbx5mfq', '_TZE204_rbbx5mfq', '_TZE200_dwcarsat', '_TZE204_dwcarsat',
      '_TZE200_blfcpsxz', '_TZE200_ogkdpgy2', '_TZE204_ogkdpgy2', '_TZE200_3ejwxpmu',
      '_TZE204_3ejwxpmu', '_TZE200_7bztmfm1', '_TZE204_7bztmfm1', '_TZE200_ggev5fsl',
      '_TZE200_u319yc66', '_TZE200_kvpwq8z7', '_TZE204_kvpwq8z7', '_TZE200_yojqa8xn',
      '_TZE204_yojqa8xn', '_TZE200_nus5kk3n', '_TZE200_mby4kbtq', '_TZE204_mby4kbtq',
      '_TZE204_uo8qcagc', '_TZE204_v6iczj35', '_TZE204_hiith90n', '_TZE284_6teua268'
    ],
    'soil_sensor': [
      '_TZE200_myd45weu', '_TZE204_myd45weu', '_TZE284_myd45weu', '_TZE200_ga1maeof',
      '_TZE200_2se8efxh', '_TZE284_2se8efxh', '_TZE284_oitavov2', '_TZE200_9cqcpkgb',
      '_TZE284_g2e6cpnw', '_TZE284_sgabhwa6', '_TZE284_awepdiwi', '_TZE284_aao3yzhs',
      '_TZE284_nhgdf6qr', '_TZE284_ap9owrsa', '_TZE284_33bwcga2', '_TZE284_wckqztdq',
      '_TZE284_3urschql', '_TZE284_nt4pquef'
    ],
    'radiator_valve': [
      '_TZE200_c88teujp', '_TZE200_azqp6ssj', '_TZE200_yw7cahqs', '_TZE200_cwnjrr72',
      '_TZE200_b6wax7g0', '_TZE200_2atgpdho', '_TZE200_pvvbommb', '_TZE200_4eeyebrt',
      '_TZE200_cpmgn2cf', '_TZE200_9sfg7gm0', '_TZE200_fhn3negr', '_TZE200_husqqvux',
      '_TZE200_kly8gjlz', '_TZE200_lnbfnyxd', '_TZE200_mudxchsu', '_TZE200_kds0pmmv',
      '_TZE200_sur6q7ko', '_TZE200_lllliz3p', '_TZE200_hvaxb2tc', '_TZE204_hvaxb2tc',
      '_TZE284_hvaxb2tc'
    ],
    'curtain_motor': [
      '_TZE200_cowvfni3', '_TZE200_wmcdj3aq', '_TZE200_fzo2pocs', '_TZE200_nogaemzt',
      '_TZE200_5zbp6j0u', '_TZE200_fdtjuw7u', '_TZE200_bqcqqjpb', '_TZE200_zpzndjez',
      '_TZE200_rddyvrci', '_TZE200_nueqqe6k', '_TZE200_gubdgai2', '_TZE200_68nvbio9',
      '_TZE200_zah67ekd', '_TZE200_nhyj64w2', '_TZE200_pw7mji0l', '_TZE204_pw7mji0l'
    ],
    'presence_sensor_radar': [
      '_TZE200_ztc6ggyl', '_TZE204_ztc6ggyl', '_TZE200_ikvncluo', '_TZE200_lyetpprm',
      '_TZE200_wukb7rhc', '_TZE204_wukb7rhc', '_TZE200_jva8ink8', '_TZE204_jva8ink8',
      '_TZE200_ar0slwnd', '_TZE200_sfiy5tfs', '_TZE204_sfiy5tfs', '_TZE204_qasjif9e',
      '_TZE204_xsm7l9xa', '_TZE284_4qznlkbu', '_TZE200_holel4dk', '_TZE204_holel4dk',
      '_TZE200_xpq2rber', '_TZE204_xpq2rber', '_TZE200_sbyx0lm6', '_TZE204_sbyx0lm6',
      '_TZE200_ybwa4x5a', '_TZE204_ybwa4x5a', '_TZE200_qomxlryd', '_TZE204_qomxlryd',
      '_TZE200_pnyz5qpy', '_TZE204_pnyz5qpy', '_TZE200_rhgsbacq', '_TZE204_rhgsbacq'
    ],
    'dimmer_wall_1gang': [
      '_TZE200_la2c2uo9', '_TZE200_4mh6tyyo', '_TZE200_ykgar0ow', '_TZE200_0hb4rdnp',
      '_TZE200_gne0e6mk', '_TZE200_a0syesf5', '_TZE204_hlx9tnzb', '_TZE204_68utemio',
      '_TZE204_zenj4lxv', '_TZE204_1v1dxkck', '_TZE204_znvwzxkq', '_TZE284_znvwzxkq',
      '_TZE204_bxoo2swd', '_TZE200_tsxpl0d0', '_TZB210_rkgngb5o'
    ],
    'switch_1gang': [
      '_TZE200_9cxuhakf', '_TZE200_0nauxa0p', '_TZ3000_ktuoyvt5', '_TZ3210_2dfy6tol',
      '_TZ3000_rgpqqmbj', '_TZ3000_8nyaanzb', '_TZ3000_iy2c3n6p', '_TZ3000_sgb0xhwn'
    ],
    'gas_sensor': [
      '_TZE204_zougpkpy', '_TZE204_chbyv06x', '_TZE284_chbyv06x', '_TZE200_yojqa8xn',
      '_TZE204_yojqa8xn'
    ],
    'motion_sensor': [
      '_TZ3000_bsvqrxru', '_TZ3040_msl6wxk9', '_TZ3000_msl6wxk9', '_TZ3000_mcxw5ehu',
      '_TZ3000_6ygjfyll', '_TZ3040_6ygjfyll', '_TZ3000_o4mkahkc', '_TZ3000_lltemgsf',
      '_TZ3000_mg4dy6z6', '_TZ3210_cwamkvua', '_TZ3040_fwxuzcf4'
    ],
    'plug_energy_monitor': [
      '_TZ3000_mvn6jl7x', '_TZ3000_raviyuvk', '_TZ3000_92qd4sqa', '_TZ3000_zwaadvus',
      '_TZ3000_k6fvknrr', '_TZ3000_6s5dc9lx', '_TZ3000_helyqdvs', '_TZ3000_qlmnxmac',
      '_TZ3000_oiymh3qu', '_TZ3000_wxtp7c5y'
    ],
    'led_strip': [
      '_TZ3210_iystcadi', '_TZ3210_it1u8ahz', '_TZB210_3zfp8mki', '_TZB210_gj0ccsar'
    ]
  };

  for (const [driverId, ids] of Object.entries(ts0601Enrichments)) {
    if (enrichDriver(driverId, ids)) {
      enrichedCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 RÉSUMÉ ENRICHISSEMENT');
  console.log('='.repeat(50));
  console.log(`✅ Drivers enrichis: ${enrichedCount}`);
  console.log(`📝 Total devices analysés: ${allDevices.length}`);
  console.log('='.repeat(50));

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    devicesAnalyzed: allDevices.length,
    driversEnriched: enrichedCount,
    driverDetails: Object.fromEntries(
      Object.entries(driverIds).map(([k, v]) => [k, Array.from(v).length])
    )
  };

  const reportPath = path.join(DATA_DIR, 'enrichment', 'mega-ts0601-enrichment-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Rapport sauvegardé: ${reportPath}`);
}

main().catch(console.error);
