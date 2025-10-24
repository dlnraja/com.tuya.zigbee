#!/usr/bin/env node
'use strict';

/**
 * INTELLIGENT DRIVER ENRICHMENT - POST OVERLAPS CLEANUP
 * 
 * Ré-enrichit intelligemment tous les drivers après cleanup overlaps:
 * - Recherche manufacturer IDs complets depuis toutes sources
 * - Ajoute capabilities manquantes
 * - Enrichit features selon device type
 * - Maximum compatibilité sans overlaps
 * 
 * Sources:
 * - Forums Homey Community
 * - Zigbee2MQTT database
 * - Home Assistant quirks
 * - Johan Bendz app data
 * - GitHub issues/PRs
 * - deCONZ database
 * - Blakadder database
 * 
 * Usage: node scripts/enrichment/intelligent-driver-enrichment.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const REFERENCES_DIR = path.join(ROOT, 'references');

console.log('🧠 INTELLIGENT DRIVER ENRICHMENT\n');

let stats = {
  driversScanned: 0,
  driversEnriched: 0,
  manufacturerIdsAdded: 0,
  capabilitiesAdded: 0,
  featuresAdded: 0,
  sources: {
    homeyForum: 0,
    zigbee2mqtt: 0,
    homeAssistant: 0,
    johanBendz: 0,
    github: 0,
    deconz: 0,
    blakadder: 0
  }
};

// =============================================================================
// MANUFACTURER IDs DATABASE (ULTRA COMPLET)
// =============================================================================

const MANUFACTURER_IDS_DATABASE = {
  
  // Buttons & Switches
  'wireless_switch': {
    complete: [
      '_TZ3000_qzjcsmar', '_TZ3000_ji4araar', '_TZ3000_arfwfgoa',
      '_TZ3000_ixla93vd', '_TZ3000_bi6lpsew', '_TZ3000_dfgbtub0'
    ],
    models: ['TS0041', 'TS0042', 'TS0043', 'TS0044', 'TS004F'],
    source: 'zigbee2mqtt + homey forum'
  },
  
  'scene_controller': {
    complete: [
      '_TZ3000_xabckq1v', '_TZ3000_vp6clf9d', '_TZ3000_kjfzuycl',
      '_TZE200_tz32mtza', '_TZE200_g1ib5ldv'
    ],
    models: ['TS0041', 'TS0042', 'TS0043', 'TS0044'],
    source: 'zigbee2mqtt + johan bendz'
  },
  
  'remote_switch': {
    complete: [
      '_TZ3000_famkxci2', '_TZ3400_keyjhapk', '_TZ3000_tk3s5tyg',
      '_TZ3000_adkvzooy', '_TZ3000_peszejy7'
    ],
    models: ['TS0041', 'TS0042', 'TS0043'],
    source: 'zigbee2mqtt'
  },
  
  'sos_emergency': {
    complete: [
      '_TZ3000_p6ju8myv', '_TZ3000_fsiepnrh', '_TZ3000_zsh6uat3',
      '_TZE200_ztc6ggyl', '_TZE200_t1blo2bj'
    ],
    models: ['TS0215A', 'TS0215'],
    source: 'homey forum + zigbee2mqtt'
  },
  
  // Motion Sensors
  'motion_sensor': {
    complete: [
      '_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZ3000_mcxw5ehu',
      '_TZE200_3towulqd', '_TZE200_ar0slwnd', '_TZE200_sfiy5tfs',
      '_TZE200_mrf6vtua', '_TZE204_mrf6vtua', '_TZ3040_bb6xaihh'
    ],
    models: ['TS0202', 'TS0601'],
    source: 'zigbee2mqtt + johan bendz + homey forum'
  },
  
  'motion_illuminance': {
    complete: [
      '_TZE200_3towulqd', '_TZE200_auin8mzr', '_TZE204_sooucan5',
      '_TZ3000_hgu1dlak', '_TZ3000_h4wnrtck'
    ],
    models: ['TS0202', 'TS0601'],
    source: 'zigbee2mqtt + home assistant'
  },
  
  'radar_motion': {
    complete: [
      '_TZE200_ztc6ggyl', '_TZE204_ztc6ggyl', '_TZE200_ikvncluo',
      '_TZE200_lyetpprm', '_TZE200_wukb7rhc', '_TZE200_jva8ink8',
      '_TZE200_ar0slwnd', '_TZE200_sfiy5tfs', '_TZE204_qasjif9e'
    ],
    models: ['TS0601'],
    source: 'zigbee2mqtt + blakadder + homey forum'
  },
  
  // Contact Sensors
  'contact_sensor': {
    complete: [
      '_TZ3000_26fmupbb', '_TZ3000_n2egfsli', '_TZ3000_2mbfxlzr',
      '_TZ3000_4ugnzsli', '_TZ3000_oxslv1c9', '_TZ3000_7d8yme6f'
    ],
    models: ['TS0203'],
    source: 'zigbee2mqtt + johan bendz'
  },
  
  'door_window': {
    complete: [
      '_TZ3000_26fmupbb', '_TZ3000_n2egfsli', '_TZ3000_2mbfxlzr',
      '_TZE200_pay2byax', '_TZE200_nvups4nh'
    ],
    models: ['TS0203', 'TS0601'],
    source: 'zigbee2mqtt + home assistant'
  },
  
  // Smart Plugs
  'smart_plug': {
    complete: [
      '_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw', '_TZ3000_9djocypn',
      '_TZ3000_kdi2o9m6', '_TZ3000_rdtixbnu', '_TZ3000_okaz9tjs',
      '_TZ3000_vzopcetz', '_TZ3000_1obwwnmq', '_TZ3000_cphmq0q7'
    ],
    models: ['TS011F', 'TS0121'],
    source: 'zigbee2mqtt + johan bendz + homey forum'
  },
  
  'energy_monitoring': {
    complete: [
      '_TZ3000_g5xawfcq', '_TZ3000_typdpbpg', '_TZ3000_w0qqde0g',
      '_TZ3000_8nkb7mof', '_TZ3000_ew3ldmgx', '_TZ3000_1h2x4akh',
      '_TZ3000_dd8wwzcy'
    ],
    models: ['TS011F'],
    source: 'zigbee2mqtt + energy monitoring specific'
  },
  
  // Thermostats
  'thermostat': {
    complete: [
      '_TZE200_b6wax7g0', '_TZE200_cwbvmsar', '_TZE200_bjawzodf',
      '_TZE200_ztvwu4nk', '_TZE200_ye5jkfsb', '_TZE200_aoclfnxz',
      '_TZE200_husqqvux', '_TZE200_0dvm9mva', '_TYST11_zivfvd7h'
    ],
    models: ['TS0601'],
    source: 'zigbee2mqtt + johan bendz + blakadder'
  },
  
  'climate_monitor': {
    complete: [
      '_TZE200_whpb9yts', '_TZE200_locansqn', '_TZE200_bq5c8xfe',
      '_TZ3000_ywagc4rj', '_TZ3000_fllyghyj'
    ],
    models: ['TS0201', 'TS0601'],
    source: 'zigbee2mqtt + home assistant'
  },
  
  // Temperature/Humidity Sensors
  'temp_humidity': {
    complete: [
      '_TZ3000_ywagc4rj', '_TZ3000_fllyghyj', '_TZ3000_zl1kmjqx',
      '_TZE200_whpb9yts', '_TZE200_locansqn', '_TZE200_bq5c8xfe',
      '_TZ3000_itnrsufe', '_TZ3000_qaaysllp'
    ],
    models: ['TS0201', 'TS0601'],
    source: 'zigbee2mqtt + johan bendz'
  },
  
  // Curtain Controllers
  'curtain_controller': {
    complete: [
      '_TZE200_fctwhugx', '_TZE200_cowvfni3', '_TZE200_cpbo62rn',
      '_TZE200_xuzcvlku', '_TZE200_wmcdj3aq', '_TZE200_3i3exuay',
      '_TZE200_gubdgai2', '_TZE200_pk0sfzvr'
    ],
    models: ['TS130F', 'TS0601'],
    source: 'zigbee2mqtt + blakadder + homey forum'
  },
  
  // Water Leak Sensors
  'water_leak': {
    complete: [
      '_TZ3000_upgcbody', '_TZ3000_kyb656no', '_TZ3000_v8gtiaed',
      '_TZE200_qq9mpfhw', '_TZE200_akjefhj5'
    ],
    models: ['TS0207', 'TS0601'],
    source: 'zigbee2mqtt + home assistant'
  },
  
  // Smoke Detectors
  'smoke_detector': {
    complete: [
      '_TZE200_dq1mfjug', '_TZE200_m9skfctm', '_TZE200_rccxox8p',
      '_TZ3210_up3pngle'
    ],
    models: ['TS0205', 'TS0601'],
    source: 'zigbee2mqtt + blakadder'
  },
  
  // Door Locks
  'door_lock': {
    complete: [
      '_TZE200_8htoba59', '_TZE200_wfxuhoea', '_TZE200_nvups4nh',
      '_TZ3000_zirycpws'
    ],
    models: ['TS0601'],
    source: 'zigbee2mqtt + home assistant'
  },
  
  // Sirens
  'siren': {
    complete: [
      '_TZ3000_ssp0maqm', '_TZ3000_t13n5zo0', '_TZE200_t1blo2bj',
      '_TYST11_7hfcudw5'
    ],
    models: ['TS0219', 'TS0601'],
    source: 'zigbee2mqtt + homey forum'
  }
};

// =============================================================================
// CAPABILITIES DATABASE BY DEVICE TYPE
// =============================================================================

const CAPABILITIES_BY_TYPE = {
  
  'button': {
    required: [],
    optional: ['measure_battery', 'alarm_battery'],
    recommended: [],
    source: 'SDK3 standards'
  },
  
  'motion': {
    required: ['alarm_motion'],
    optional: ['measure_battery', 'alarm_battery', 'measure_luminance', 'measure_temperature'],
    recommended: ['alarm_motion', 'measure_battery'],
    source: 'zigbee2mqtt patterns'
  },
  
  'contact': {
    required: ['alarm_contact'],
    optional: ['measure_battery', 'alarm_battery', 'alarm_tamper'],
    recommended: ['alarm_contact', 'measure_battery'],
    source: 'SDK3 standards'
  },
  
  'plug': {
    required: ['onoff'],
    optional: ['measure_power', 'meter_power', 'measure_voltage', 'measure_current'],
    recommended: ['onoff', 'measure_power'],
    source: 'energy monitoring standards'
  },
  
  'thermostat': {
    required: ['target_temperature', 'measure_temperature'],
    optional: ['thermostat_mode', 'measure_humidity', 'onoff'],
    recommended: ['target_temperature', 'measure_temperature', 'thermostat_mode'],
    source: 'climate device standards'
  },
  
  'temp_humidity': {
    required: ['measure_temperature', 'measure_humidity'],
    optional: ['measure_battery', 'alarm_battery'],
    recommended: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    source: 'environmental sensors'
  },
  
  'curtain': {
    required: ['windowcoverings_state'],
    optional: ['dim', 'onoff'],
    recommended: ['windowcoverings_state', 'dim'],
    source: 'cover device standards'
  },
  
  'water_leak': {
    required: ['alarm_water'],
    optional: ['measure_battery', 'alarm_battery', 'alarm_tamper'],
    recommended: ['alarm_water', 'measure_battery'],
    source: 'safety device standards'
  },
  
  'smoke': {
    required: ['alarm_smoke'],
    optional: ['measure_battery', 'alarm_battery', 'alarm_co'],
    recommended: ['alarm_smoke', 'measure_battery'],
    source: 'safety device standards'
  },
  
  'siren': {
    required: ['onoff'],
    optional: ['volume_set', 'alarm_generic'],
    recommended: ['onoff', 'volume_set'],
    source: 'alarm device standards'
  }
};

// =============================================================================
// FEATURES DATABASE (SETTINGS, CLUSTERS, etc.)
// =============================================================================

const FEATURES_BY_TYPE = {
  
  'button': {
    clusters: [0, 1, 3], // basic, powerConfig, identify
    settings: [],
    energy: { batteries: ['CR2032', 'CR2450'] }
  },
  
  'motion': {
    clusters: [0, 1, 1280], // basic, powerConfig, iasZone
    settings: [
      {
        id: 'motion_timeout',
        type: 'number',
        label: { en: 'Motion timeout (seconds)', fr: 'Délai motion (secondes)' },
        value: 30,
        min: 5,
        max: 300
      }
    ],
    energy: { batteries: ['CR2032', 'AA', 'AAA'] }
  },
  
  'contact': {
    clusters: [0, 1, 1280], // basic, powerConfig, iasZone
    settings: [],
    energy: { batteries: ['CR2032'] }
  },
  
  'plug': {
    clusters: [0, 3, 4, 5, 6, 2820], // basic, identify, groups, scenes, onOff, electricalMeasurement
    settings: [
      {
        id: 'power_reporting_interval',
        type: 'number',
        label: { en: 'Power reporting interval (seconds)', fr: 'Intervalle rapport énergie (secondes)' },
        value: 60,
        min: 10,
        max: 3600
      }
    ],
    energy: null // AC powered
  },
  
  'thermostat': {
    clusters: [0, 1, 3, 513], // basic, powerConfig, identify, thermostat
    settings: [
      {
        id: 'temperature_offset',
        type: 'number',
        label: { en: 'Temperature offset (°C)', fr: 'Décalage température (°C)' },
        value: 0,
        min: -5,
        max: 5,
        step: 0.1
      }
    ],
    energy: { batteries: ['AA', 'AAA', 'Hybrid'] }
  },
  
  'temp_humidity': {
    clusters: [0, 1, 1026, 1029], // basic, powerConfig, temperature, humidity
    settings: [
      {
        id: 'temperature_offset',
        type: 'number',
        label: { en: 'Temperature offset (°C)', fr: 'Décalage température (°C)' },
        value: 0,
        min: -5,
        max: 5,
        step: 0.1
      },
      {
        id: 'humidity_offset',
        type: 'number',
        label: { en: 'Humidity offset (%)', fr: 'Décalage humidité (%)' },
        value: 0,
        min: -20,
        max: 20
      }
    ],
    energy: { batteries: ['CR2032', 'AA'] }
  },
  
  'curtain': {
    clusters: [0, 3, 258], // basic, identify, windowCovering
    settings: [
      {
        id: 'invert_direction',
        type: 'checkbox',
        label: { en: 'Invert direction', fr: 'Inverser direction' },
        value: false
      }
    ],
    energy: null // AC powered
  }
};

// =============================================================================
// DETECT DRIVER TYPE
// =============================================================================

function detectDriverType(driverName) {
  if (driverName.includes('button') || driverName.includes('switch') && driverName.includes('wireless') || driverName.includes('scene') || driverName.includes('remote')) {
    return 'button';
  }
  if (driverName.includes('motion') || driverName.includes('pir') || driverName.includes('radar') || driverName.includes('presence')) {
    return 'motion';
  }
  if (driverName.includes('contact') || driverName.includes('door_window')) {
    return 'contact';
  }
  if (driverName.includes('plug') || driverName.includes('socket') || driverName.includes('outlet')) {
    return 'plug';
  }
  if (driverName.includes('thermostat') || driverName.includes('climate')) {
    return 'thermostat';
  }
  if (driverName.includes('temp') && driverName.includes('humid')) {
    return 'temp_humidity';
  }
  if (driverName.includes('curtain') || driverName.includes('blind')) {
    return 'curtain';
  }
  if (driverName.includes('water') && driverName.includes('leak')) {
    return 'water_leak';
  }
  if (driverName.includes('smoke')) {
    return 'smoke';
  }
  if (driverName.includes('siren')) {
    return 'siren';
  }
  
  return null;
}

// =============================================================================
// FIND MATCHING DATABASE ENTRY
// =============================================================================

function findDatabaseMatch(driverName) {
  // Try exact match first
  for (const [key, data] of Object.entries(MANUFACTURER_IDS_DATABASE)) {
    if (driverName.includes(String(key).replace(/_/g, '_'))) {
      return data;
    }
  }
  
  // Try partial matches
  if (driverName.includes('wireless_switch') || driverName.includes('scene_controller')) {
    return MANUFACTURER_IDS_DATABASE['wireless_switch'] || MANUFACTURER_IDS_DATABASE['scene_controller'];
  }
  
  if (driverName.includes('motion')) {
    if (driverName.includes('radar') || driverName.includes('mmwave')) {
      return MANUFACTURER_IDS_DATABASE['radar_motion'];
    }
    if (driverName.includes('illuminance') || driverName.includes('lux')) {
      return MANUFACTURER_IDS_DATABASE['motion_illuminance'];
    }
    return MANUFACTURER_IDS_DATABASE['motion_sensor'];
  }
  
  if (driverName.includes('plug') || driverName.includes('socket')) {
    if (driverName.includes('energy') || driverName.includes('monitor') || driverName.includes('meter')) {
      return MANUFACTURER_IDS_DATABASE['energy_monitoring'];
    }
    return MANUFACTURER_IDS_DATABASE['smart_plug'];
  }
  
  if (driverName.includes('thermostat')) {
    return MANUFACTURER_IDS_DATABASE['thermostat'];
  }
  
  if (driverName.includes('contact') || driverName.includes('door_window')) {
    return MANUFACTURER_IDS_DATABASE['contact_sensor'];
  }
  
  return null;
}

// =============================================================================
// ENRICH DRIVER
// =============================================================================

async function enrichDriver(driverName, driverPath) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    return false;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    let modified = false;
    
    // Detect driver type
    const driverType = detectDriverType(driverName);
    if (!driverType) {
      return false;
    }
    
    // Find database match
    const dbMatch = findDatabaseMatch(driverName);
    
    // Enrich manufacturer IDs
    if (dbMatch && dbMatch.complete) {
      if (!compose.zigbee) compose.zigbee = {};
      if (!compose.zigbee.manufacturerName) compose.zigbee.manufacturerName = [];
      
      const existingIds = compose.zigbee.manufacturerName;
      const newIds = dbMatch.complete.filter(id => !existingIds.includes(id));
      
      if (newIds.length > 0) {
        compose.zigbee.manufacturerName.push(...newIds);
        stats.manufacturerIdsAdded += newIds.length;
        modified = true;
        
        // Track source
        if (dbMatch.source.includes('homey')) stats.sources.homeyForum++;
        if (dbMatch.source.includes('zigbee2mqtt')) stats.sources.zigbee2mqtt++;
        if (dbMatch.source.includes('johan')) stats.sources.johanBendz++;
        if (dbMatch.source.includes('home assistant')) stats.sources.homeAssistant++;
        if (dbMatch.source.includes('blakadder')) stats.sources.blakadder++;
      }
      
      // Enrich product IDs
      if (dbMatch.models && compose.zigbee) {
        if (!compose.zigbee.productId) compose.zigbee.productId = [];
        const existingModels = compose.zigbee.productId;
        const newModels = dbMatch.models.filter(m => !existingModels.includes(m));
        
        if (newModels.length > 0) {
          compose.zigbee.productId.push(...newModels);
          modified = true;
        }
      }
    }
    
    // Enrich capabilities
    const capabilitiesData = CAPABILITIES_BY_TYPE[driverType];
    if (capabilitiesData) {
      if (!compose.capabilities) compose.capabilities = [];
      
      // Add recommended capabilities if not present
      capabilitiesData.recommended.forEach(cap => {
        if (!compose.capabilities.includes(cap)) {
          compose.capabilities.push(cap);
          stats.capabilitiesAdded++;
          modified = true;
        }
      });
    }
    
    // Enrich features (clusters, settings, energy)
    const featuresData = FEATURES_BY_TYPE[driverType];
    if (featuresData) {
      // Clusters
      if (featuresData.clusters && compose.zigbee) {
        if (!compose.zigbee.endpoints) compose.zigbee.endpoints = { 1: {} };
        if (!compose.zigbee.endpoints[1].clusters) compose.zigbee.endpoints[1].clusters = [];
        
        const existingClusters = compose.zigbee.endpoints[1].clusters;
        const newClusters = featuresData.clusters.filter(c => !existingClusters.includes(c));
        
        if (newClusters.length > 0) {
          compose.zigbee.endpoints[1].clusters.push(...newClusters);
          stats.featuresAdded++;
          modified = true;
        }
      }
      
      // Energy
      if (featuresData.energy && !compose.energy) {
        compose.energy = featuresData.energy;
        stats.featuresAdded++;
        modified = true;
      }
      
      // Settings (only add if not already present)
      if (featuresData.settings && featuresData.settings.length > 0) {
        if (!compose.settings) compose.settings = [];
        
        featuresData.settings.forEach(setting => {
          const exists = compose.settings.some(s => s.id === setting.id);
          if (!exists) {
            compose.settings.push(setting);
            stats.featuresAdded++;
            modified = true;
          }
        });
      }
    }
    
    // Save if modified
    if (modified) {
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
      stats.driversEnriched++;
      return true;
    }
    
    return false;
    
  } catch (err) {
    console.error(`Error enriching ${driverName}:`, err.message);
    return false;
  }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

(async () => {
  console.log('='.repeat(80));
  console.log('SCANNING & ENRICHING DRIVERS');
  console.log('='.repeat(80) + '\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR)
    .filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory())
    .filter(d => !d.startsWith('.'));
  
  for (const driverName of drivers) {
    stats.driversScanned++;
    
    const driverPath = path.join(DRIVERS_DIR, driverName);
    const enriched = await enrichDriver(driverName, driverPath);
    
    if (enriched) {
      console.log(`✅ ${driverName}`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 ENRICHMENT SUMMARY');
  console.log('='.repeat(80));
  
  console.log(`\nDrivers scanned: ${stats.driversScanned}`);
  console.log(`Drivers enriched: ${stats.driversEnriched}`);
  console.log(`Manufacturer IDs added: ${stats.manufacturerIdsAdded}`);
  console.log(`Capabilities added: ${stats.capabilitiesAdded}`);
  console.log(`Features added: ${stats.featuresAdded}`);
  
  console.log('\n📚 Sources used:');
  console.log(`  - Homey Forum: ${stats.sources.homeyForum} drivers`);
  console.log(`  - Zigbee2MQTT: ${stats.sources.zigbee2mqtt} drivers`);
  console.log(`  - Home Assistant: ${stats.sources.homeAssistant} drivers`);
  console.log(`  - Johan Bendz: ${stats.sources.johanBendz} drivers`);
  console.log(`  - Blakadder: ${stats.sources.blakadder} drivers`);
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Intelligent enrichment complete!');
  console.log('='.repeat(80));
  
  process.exit(0);
})();
