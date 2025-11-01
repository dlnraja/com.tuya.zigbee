#!/usr/bin/env node
/**
 * INTELLIGENT MULTI-DRIVER ENRICHER
 * Enrichit intelligemment tous les drivers avec les manufacturer IDs appropriés
 * Gère les cas où un ID peut être dans plusieurs drivers (produits multi-fonctions)
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// Base de connaissance: Manufacturer IDs qui peuvent être dans plusieurs drivers
const MULTI_DRIVER_IDS = {
  // IDs qui supportent plusieurs configurations selon le firmware/setup
  
  // Smart Plugs - peuvent être simples ou avec monitoring
  'TS011F': {
    primary: 'plug_energy_monitoring',
    alternatives: ['plug_1gang_ac', 'plug_2gang_ac', 'outlet_ac'],
    reason: 'Variantes avec/sans energy monitoring'
  },
  
  // Switches - peuvent être wall ou wireless selon mounting
  'TS0001': {
    primary: 'switch_wall_1gang',
    alternatives: ['switch_generic_1gang', 'switch_basic_1gang', 'switch_smart_1gang'],
    reason: 'Variantes mounting et features'
  },
  'TS0002': {
    primary: 'switch_wall_2gang',
    alternatives: ['switch_generic_2gang', 'switch_basic_2gang', 'switch_smart_2gang'],
    reason: 'Variantes mounting et features'
  },
  'TS0003': {
    primary: 'switch_wall_3gang',
    alternatives: ['switch_generic_3gang', 'switch_basic_3gang', 'switch_smart_3gang'],
    reason: 'Variantes mounting et features'
  },
  'TS0004': {
    primary: 'switch_wall_4gang',
    alternatives: ['switch_generic_4gang', 'switch_basic_4gang', 'switch_smart_4gang'],
    reason: 'Variantes mounting et features'
  },
  
  // Wireless buttons - peuvent varier selon firmware
  'TS0041': {
    primary: 'button_wireless_1',
    alternatives: ['switch_wireless_1gang', 'button_remote_1'],
    reason: 'Mode switch ou scene controller'
  },
  'TS0042': {
    primary: 'button_wireless_2',
    alternatives: ['switch_wireless_2gang', 'button_remote_2'],
    reason: 'Mode switch ou scene controller'
  },
  'TS0043': {
    primary: 'button_wireless_3',
    alternatives: ['switch_wireless_3gang', 'button_remote_3'],
    reason: 'Mode switch ou scene controller'
  },
  'TS0044': {
    primary: 'button_wireless_4',
    alternatives: ['switch_wireless_4gang', 'button_remote_4', 'switch_wireless_4button_alt'],
    reason: 'Mode switch ou scene controller'
  },
  
  // Sensors - peuvent avoir features additionnelles
  'TS0202': {
    primary: 'motion_sensor',
    alternatives: ['motion_sensor_battery', 'motion_sensor_illuminance'],
    reason: 'Variantes avec/sans illuminance sensor'
  },
  'TS0203': {
    primary: 'contact_sensor',
    alternatives: ['contact_sensor_battery'],
    reason: 'Variantes battery'
  },
  'TS0201': {
    primary: 'climate_monitor_temp_humidity',
    alternatives: ['temperature_sensor', 'temperature_sensor_advanced'],
    reason: 'Variantes features'
  },
  
  // Climate devices - multi-fonctions
  'TS0601': {
    primary: 'thermostat_temperature_control',
    alternatives: [
      'climate_monitor_temp_humidity',
      'thermostat_smart',
      'thermostat_advanced',
      'radiator_valve_smart',
      'climate_sensor_soil'
    ],
    reason: 'Tuya generic - multiples variantes selon datapoints'
  },
  
  // Bulbs - peuvent être RGB ou tunable white
  'TS0505B': {
    primary: 'led_strip_rgbw',
    alternatives: ['bulb_rgb', 'ceiling_light_rgb_ac', 'led_strip_rgbcct_dc'],
    reason: 'RGB controller - multiples form factors'
  },
  'TS0505A': {
    primary: 'bulb_rgb',
    alternatives: ['led_strip_rgbw', 'ceiling_light_rgb_ac'],
    reason: 'RGB variantes'
  },
  
  // Curtain controllers
  'TS130F': {
    primary: 'curtain_controller',
    alternatives: ['blind_controller', 'blind_roller_controller'],
    reason: 'Moteurs curtains/blinds'
  }
};

// Patterns de manufacturer IDs par type de produit
const MANUFACTURER_PATTERNS = {
  // Patterns pour identifier les types de produits
  
  // Plugs & Outlets
  plugs: {
    pattern: /^(plug_|outlet_)/,
    commonIds: [
      'TS011F', '_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw', '_TZ3000_typdpbpg',
      '_TZ3000_tvuarksa', '_TZ3000_okaz9tjs', '_TZ3000_8nkb7mof'
    ],
    shouldShareIds: true
  },
  
  // Wall Switches (1-6 gang)
  wallSwitches: {
    pattern: /^switch_(wall|touch|basic|smart|generic)_(\d+)gang/,
    commonIds: [
      'TS0001', 'TS0002', 'TS0003', 'TS0004', 'TS0005', 'TS0006',
      '_TZ3000_zmy1waw6', '_TZ3000_o005nuxx', '_TZ3000_4fjiwweb',
      '_TZ3000_qzjcsmar', '_TZ3000_ji4araar', '_TZ3000_yw8z2axp'
    ],
    groupByGang: true,
    shouldShareIds: true
  },
  
  // Wireless Buttons/Remotes
  wirelessButtons: {
    pattern: /^(button_wireless|switch_wireless|button_remote)_(\d+)/,
    commonIds: [
      'TS0041', 'TS0042', 'TS0043', 'TS0044',
      '_TZ3000_xabckq1v', '_TZ3000_vp6clf9d', '_TZ3000_fvh3pjaz',
      '_TZ3000_bi6lpsew', '_TZ3000_a7ouggvs', '_TZ3000_adkvzooy'
    ],
    groupByButtons: true,
    shouldShareIds: true
  },
  
  // Motion Sensors
  motionSensors: {
    pattern: /^motion_sensor/,
    commonIds: [
      'TS0202', '_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZ3000_mcxw5ehu',
      '_TZ3040_bb6xaihh', '_TZ3000_msl6wxk9', '_TZE200_3towulqd'
    ],
    shouldShareIds: true
  },
  
  // Contact/Door Sensors
  contactSensors: {
    pattern: /^contact_sensor/,
    commonIds: [
      'TS0203', '_TZ3000_26fmupbb', '_TZ3000_n2egfsli', '_TZ3000_msl2rxjn',
      '_TZ3000_oxslv1c9', '_TZ3000_402jjyro'
    ],
    shouldShareIds: true
  },
  
  // Temperature/Humidity Sensors
  climateSensors: {
    pattern: /^(climate_monitor|temperature_sensor|climate_sensor)/,
    commonIds: [
      'TS0201', '_TZE200_locansqn', '_TZE200_bq5c8xfe', '_TZE204_upagmta9',
      '_TZ3000_ywagc4rj', '_TZ3000_zl1kmjqx', '_TZE200_a8sdabtg'
    ],
    shouldShareIds: true
  },
  
  // RGB Bulbs & LED Strips
  rgbLighting: {
    pattern: /^(bulb_rgb|led_strip|ceiling_light_rgb)/,
    commonIds: [
      'TS0505B', 'TS0505A', '_TZ3210_r0xgkft5', '_TZ3210_sroezl0s',
      '_TZ3000_obacbukl', '_TZ3000_odygigth', '_TZ3000_kdpxju99'
    ],
    shouldShareIds: true
  },
  
  // Tunable White Bulbs
  tunableWhite: {
    pattern: /^(bulb_(tunable_white|white|dimable))/,
    commonIds: [
      'TS0502B', 'TS0502A', '_TZ3210_ngqk6jia', '_TZ3210_p9ao60da',
      '_TZ3000_obacbukl', '_TZ3000_kdpxju99'
    ],
    shouldShareIds: true
  },
  
  // Thermostats
  thermostats: {
    pattern: /^(thermostat|radiator_valve)/,
    commonIds: [
      'TS0601', '_TZE200_cowvfni3', '_TZE200_azqp6ssj', '_TZE200_ye5jkfsb',
      '_TZE200_bvu2wnxz', '_TZE200_hue3yfsn', '_TZE204_aoclfnxz'
    ],
    shouldShareIds: false // Trop de variantes différentes
  },
  
  // Curtain/Blind Controllers
  curtainControllers: {
    pattern: /^(curtain|blind)/,
    commonIds: [
      'TS130F', '_TZE200_fctwhugx', '_TZE200_cowvfni3', '_TZE200_xuzcvlku',
      '_TZE200_5zbp6j0u', '_TZE200_nogaemzt', '_TZE200_nv6nxo0c'
    ],
    shouldShareIds: true
  },
  
  // Water/Leak Sensors
  waterSensors: {
    pattern: /^water_(leak|valve)/,
    commonIds: [
      '_TZ3000_kyb656no', '_TZ3000_k4ej3ww2', '_TZ3000_upgcbody',
      '_TZE200_sh1btabb', '_TZE200_htnnfasr'
    ],
    shouldShareIds: true
  },
  
  // Smoke/Gas Sensors
  alarmSensors: {
    pattern: /^(smoke|gas)_/,
    commonIds: [
      '_TZ3000_tk3s5tyg', '_TZ3000_mwd3c2at', '_TZE200_yh7aoahi',
      '_TZE200_rccxox8p', '_TZE200_ntcy3xu1'
    ],
    shouldShareIds: true
  },
  
  // Sirens
  sirens: {
    pattern: /^siren/,
    commonIds: [
      '_TZ3000_d0yu2xgi', '_TZ3000_26fmupbb', '_TZE200_t1blo2bj',
      'TS0601_siren'
    ],
    shouldShareIds: true
  }
};

// Fonction pour extraire le gang number d'un driver name
function extractGangNumber(driverName) {
  const match = driverName.match(/(\d+)gang/);
  return match ? parseInt(match[1]) : null;
}

// Fonction pour extraire le button number d'un driver name
function extractButtonNumber(driverName) {
  const match = driverName.match(/wireless_(\d+)/);
  return match ? parseInt(match[1]) : null;
}

// Lecture de tous les drivers actuels
function loadAllDrivers() {
  const drivers = {};
  
  if (!fs.existsSync(DRIVERS_DIR)) {
    console.error('❌ Drivers directory not found');
    return drivers;
  }
  
  const driverNames = fs.readdirSync(DRIVERS_DIR).filter(name => {
    const fullPath = path.join(DRIVERS_DIR, name);
    return fs.statSync(fullPath).isDirectory() && !name.startsWith('.');
  });
  
  for (const driverName of driverNames) {
    const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
    
    if (fs.existsSync(composeFile)) {
      try {
        const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
        
        const manufacturerIds = [];
        const productIds = [];
        
        if (compose.zigbee) {
          if (compose.zigbee.manufacturerName) {
            const ids = Array.isArray(compose.zigbee.manufacturerName) 
              ? compose.zigbee.manufacturerName 
              : [compose.zigbee.manufacturerName];
            manufacturerIds.push(...ids);
          }
          
          if (compose.zigbee.productId) {
            const ids = Array.isArray(compose.zigbee.productId) 
              ? compose.zigbee.productId 
              : [compose.zigbee.productId];
            productIds.push(...ids);
          }
        }
        
        drivers[driverName] = {
          path: path.join(DRIVERS_DIR, driverName),
          compose: compose,
          manufacturerIds: manufacturerIds,
          productIds: productIds
        };
      } catch (err) {
        console.error(`⚠️  Error reading ${driverName}:`, err.message);
      }
    }
  }
  
  return drivers;
}

// Enrichissement intelligent basé sur les patterns
function enrichDriversIntelligently(drivers) {
  console.log('\n🧠 Starting intelligent enrichment...\n');
  
  const enrichments = [];
  
  // Pour chaque pattern
  for (const [categoryName, category] of Object.entries(MANUFACTURER_PATTERNS)) {
    console.log(`\n📦 Processing category: ${categoryName}`);
    
    if (!category.shouldShareIds) {
      console.log(`  ⏭️  Skipping (complex variantes)`);
      continue;
    }
    
    // Trouver tous les drivers qui matchent ce pattern
    const matchingDrivers = Object.keys(drivers).filter(name => 
      category.pattern.test(name)
    );
    
    if (matchingDrivers.length === 0) {
      console.log(`  ⏭️  No drivers found`);
      continue;
    }
    
    console.log(`  Found ${matchingDrivers.length} drivers`);
    
    // Si groupByGang, grouper par gang number
    if (category.groupByGang) {
      const gangGroups = {};
      
      for (const driverName of matchingDrivers) {
        const gang = extractGangNumber(driverName);
        if (gang) {
          if (!gangGroups[gang]) gangGroups[gang] = [];
          gangGroups[gang].push(driverName);
        }
      }
      
      // Enrichir chaque groupe avec les IDs appropriés
      for (const [gang, groupDrivers] of Object.entries(gangGroups)) {
        console.log(`\n  Gang ${gang}: ${groupDrivers.length} drivers`);
        
        // Collecter tous les IDs existants dans ce groupe
        const existingIds = new Set();
        for (const driverName of groupDrivers) {
          drivers[driverName].manufacturerIds.forEach(id => existingIds.add(id));
          drivers[driverName].productIds.forEach(id => existingIds.add(id));
        }
        
        // Ajouter les common IDs
        const idsToAdd = category.commonIds.filter(id => !existingIds.has(id));
        
        if (idsToAdd.length > 0) {
          for (const driverName of groupDrivers) {
            enrichments.push({
              driver: driverName,
              category: categoryName,
              gang: gang,
              idsToAdd: idsToAdd,
              reason: `Shared IDs for ${gang}-gang switches`
            });
          }
        }
      }
    }
    // Si groupByButtons, grouper par button number
    else if (category.groupByButtons) {
      const buttonGroups = {};
      
      for (const driverName of matchingDrivers) {
        const buttons = extractButtonNumber(driverName);
        if (buttons) {
          if (!buttonGroups[buttons]) buttonGroups[buttons] = [];
          buttonGroups[buttons].push(driverName);
        }
      }
      
      for (const [buttons, groupDrivers] of Object.entries(buttonGroups)) {
        console.log(`\n  ${buttons}-button: ${groupDrivers.length} drivers`);
        
        const existingIds = new Set();
        for (const driverName of groupDrivers) {
          drivers[driverName].manufacturerIds.forEach(id => existingIds.add(id));
          drivers[driverName].productIds.forEach(id => existingIds.add(id));
        }
        
        const idsToAdd = category.commonIds.filter(id => !existingIds.has(id));
        
        if (idsToAdd.length > 0) {
          for (const driverName of groupDrivers) {
            enrichments.push({
              driver: driverName,
              category: categoryName,
              buttons: buttons,
              idsToAdd: idsToAdd,
              reason: `Shared IDs for ${buttons}-button remotes`
            });
          }
        }
      }
    }
    // Sinon, partager entre tous les drivers du pattern
    else {
      console.log(`  Sharing IDs across all ${matchingDrivers.length} drivers`);
      
      const existingIds = new Set();
      for (const driverName of matchingDrivers) {
        drivers[driverName].manufacturerIds.forEach(id => existingIds.add(id));
        drivers[driverName].productIds.forEach(id => existingIds.add(id));
      }
      
      const idsToAdd = category.commonIds.filter(id => !existingIds.has(id));
      
      if (idsToAdd.length > 0) {
        for (const driverName of matchingDrivers) {
          enrichments.push({
            driver: driverName,
            category: categoryName,
            idsToAdd: idsToAdd,
            reason: `Shared IDs for ${categoryName}`
          });
        }
      }
    }
  }
  
  return enrichments;
}

// Appliquer les enrichissements
function applyEnrichments(drivers, enrichments) {
  console.log(`\n✏️  Applying ${enrichments.length} enrichments...\n`);
  
  const backupDir = path.join(ROOT, '.enrichment-backups', new Date().toISOString().replace(/:/g, '-'));
  fs.mkdirSync(backupDir, { recursive: true });
  
  let appliedCount = 0;
  const summary = {};
  
  for (const enrichment of enrichments) {
    const driver = drivers[enrichment.driver];
    if (!driver) continue;
    
    const composeFile = path.join(driver.path, 'driver.compose.json');
    
    // Backup
    const backupFile = path.join(backupDir, `${enrichment.driver}.driver.compose.json`);
    fs.copyFileSync(composeFile, backupFile);
    
    // Lire le compose actuel
    const compose = driver.compose;
    
    // Ajouter les IDs
    if (!compose.zigbee) compose.zigbee = {};
    
    // Merger manufacturer IDs
    const currentMfg = compose.zigbee.manufacturerName 
      ? (Array.isArray(compose.zigbee.manufacturerName) ? compose.zigbee.manufacturerName : [compose.zigbee.manufacturerName])
      : [];
    
    const newMfg = [...new Set([...currentMfg, ...enrichment.idsToAdd.filter(id => id.startsWith('_TZ'))])];
    
    // Merger product IDs
    const currentProd = compose.zigbee.productId 
      ? (Array.isArray(compose.zigbee.productId) ? compose.zigbee.productId : [compose.zigbee.productId])
      : [];
    
    const newProd = [...new Set([...currentProd, ...enrichment.idsToAdd.filter(id => id.startsWith('TS'))])];
    
    // Update
    if (newMfg.length > currentMfg.length || newProd.length > currentProd.length) {
      compose.zigbee.manufacturerName = newMfg.length > 0 ? newMfg : undefined;
      compose.zigbee.productId = newProd.length > 0 ? newProd : undefined;
      
      // Sauvegarder
      fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2) + '\n', 'utf8');
      
      appliedCount++;
      
      // Tracking
      if (!summary[enrichment.category]) {
        summary[enrichment.category] = { drivers: 0, idsAdded: 0 };
      }
      summary[enrichment.category].drivers++;
      summary[enrichment.category].idsAdded += (newMfg.length - currentMfg.length) + (newProd.length - currentProd.length);
      
      console.log(`  ✅ ${enrichment.driver}: +${newMfg.length - currentMfg.length} mfg, +${newProd.length - currentProd.length} prod`);
    }
  }
  
  return { appliedCount, summary, backupDir };
}

function main() {
  console.log('🧠 INTELLIGENT MULTI-DRIVER ENRICHER\n');
  console.log('Enriching all drivers with appropriate manufacturer IDs...\n');
  
  // Load all drivers
  console.log('📂 Loading all drivers...');
  const drivers = loadAllDrivers();
  console.log(`  Loaded ${Object.keys(drivers).length} drivers\n`);
  
  // Analyze and create enrichments
  const enrichments = enrichDriversIntelligently(drivers);
  
  if (enrichments.length === 0) {
    console.log('\n✅ All drivers already have appropriate IDs');
    return;
  }
  
  console.log(`\n📊 Found ${enrichments.length} enrichment opportunities`);
  
  // Apply enrichments
  const result = applyEnrichments(drivers, enrichments);
  
  // Report
  const report = {
    date: new Date().toISOString(),
    totalDrivers: Object.keys(drivers).length,
    enrichmentsApplied: result.appliedCount,
    summary: result.summary,
    backupLocation: result.backupDir
  };
  
  const reportPath = path.join(ROOT, 'reports', 'MULTI_DRIVER_ENRICHMENT_REPORT.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  
  console.log(`\n✅ Enrichment complete!`);
  console.log(`   Applied: ${result.appliedCount} enrichments`);
  console.log(`   Backup: ${result.backupDir}`);
  console.log(`   Report: ${reportPath}`);
  
  console.log(`\n📊 Summary by category:`);
  for (const [category, stats] of Object.entries(result.summary)) {
    console.log(`   ${category}: ${stats.drivers} drivers, ${stats.idsAdded} IDs added`);
  }
}

main();
