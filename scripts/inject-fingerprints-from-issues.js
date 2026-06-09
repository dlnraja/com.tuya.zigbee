'use strict';
/**
 * inject-fingerprints-from-issues.js
 * Injecte les fingerprints extraits des Issues GitHub dans les driver.compose.json
 * Sources: Issues #322, #324, #328, #329, #333, #334, #337, #339, #340, #342, #347
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// === FINGERPRINTS EXTRAITS DES ISSUES GITHUB ===
// Format: { driverId, manufacturerName: [], productId: [], note }
const FINGERPRINTS_FROM_ISSUES = [
  // Issue #322 - LORATAP TS0043
  {
    driverId: 'button_scene_switch_3gang',
    manufacturerName: ['_TZ3000_famkxci2'],
    productId: ['TS0043'],
    note: 'Issue #322 - LoraTap TS0043 3-gang scene switch'
  },
  // Issue #324 - 2.4GHz MMwave _TZE200_hl0ss9oa
  {
    driverId: 'presence_sensor_mmwave',
    manufacturerName: ['_TZE200_hl0ss9oa', '_TZE204_hl0ss9oa'],
    productId: ['TS0601'],
    note: 'Issue #324 - ZY-M100 2.4GHz MMwave presence sensor'
  },
  // Issue #329 - CT Clamp Power Meter
  {
    driverId: 'power_meter_ct_clamp',
    manufacturerName: ['_TZE200_byzdayie', '_TZE204_byzdayie', '_TZE200_lsanae86'],
    productId: ['TS0601'],
    note: 'Issue #329 - CT Clamp Power Meter'
  },
  // Issue #328 - Bed Occupancy / Pressure Sensing Strap
  {
    driverId: 'bed_sensor',
    manufacturerName: ['_TZE200_v6ossqfy', '_TZE204_v6ossqfy', '_TZE200_8ygsuhe1'],
    productId: ['TS0601'],
    note: 'Issue #328 - Bed Occupancy/Pressure sensor'
  },
  // Issue #334/#333 - Smart Button _TZ3000_yj6k7vfo
  {
    driverId: 'button_wireless_smart',
    manufacturerName: ['_TZ3000_yj6k7vfo', '_TZ3000_ja5osu5g', '_TYZB02_keyjqtha'],
    productId: ['TS0041', 'TS0042'],
    note: 'Issue #334 - Smart Button _TZ3000_yj6k7vfo'
  },
  // Issue #337 - motion_sensor_2 _TZE200_3towulqd
  {
    driverId: 'motion_sensor_2',
    manufacturerName: ['_TZE200_3towulqd', '_TZE204_3towulqd', '_TZE200_ikvncluo', '_TZE204_ikvncluo'],
    productId: ['TS0601'],
    note: 'Issue #337 - motion_sensor_2 _TZE200_3towulqd'
  },
  // Issue #339 - radiator_valve _TZE200_9xfjixap (AVATTO ME167)
  {
    driverId: 'radiator_valve',
    manufacturerName: [
      '_TZE200_9xfjixap', '_TZE200_ye5jkfsb', '_TZE200_zion52ef',
      '_TZE200_2atgpdho', '_TZE200_hue3yfsn', '_TZE200_0j6pth9y',
      '_TZE204_9xfjixap'
    ],
    productId: ['TS0601'],
    note: 'Issue #339 - Radiator valve AVATTO ME167 _TZE200_9xfjixap'
  },
  // Issue #340 - soil_sensor ZG-303Z
  {
    driverId: 'soil_sensor',
    manufacturerName: [
      '_TZE200_myd45weu', '_TZE200_ga1maeof', '_TZE200_znlldql1',
      '_TZE200_pay2byax', '_TZE200_m6ec2pgj', '_TZE204_myd45weu'
    ],
    productId: ['TS0601'],
    note: 'Issue #340 - Soil sensor ZG-303Z'
  }
];

// === FINGERPRINTS DES AUTO-PRs #342 et #347 (issus de Z2M/ZHA/JohanBendz) ===
// Ces fingerprints sont pour les drivers qui existent déjà avec MF vide
const BULK_FINGERPRINTS = {
  // Drivers air_purifier_* → ces drivers sont des "variants" du driver air_purifier
  // Ils ne devraient pas avoir de fingerprints propres - ils héritent du pairing du parent
  // SAUF s'ils sont des drivers indépendants avec des appareils différents
  
  // Porte-garage
  'garage_door_opener': {
    manufacturerName: ['_TZE608_c75zqghm', '_TZE200_c75zqghm', '_TZE204_c75zqghm'],
    productId: ['TS0601']
  },
  // Smart plug DIN rail
  'smart_plug_din': {
    manufacturerName: ['_TZ3000_gzvniqjb', '_TZ3000_okaz9tjs', '_TZ3000_typddjyr'],
    productId: ['TS0001', 'TS011F']
  },
  // Motion sensor variant
  'motion_sensor': {
    manufacturerName: [
      '_TYZB01_dl7cejts', '_TZ3000_mcxw5ehu', '_TZ3000_msl6wxk9',
      '_TYZB01_v8jnclqd', '_TZ3000_wrgn6xrz', '_TZ3000_nss8amz9'
    ],
    productId: ['TS0202']
  },
  'motion_sensor_2': {
    manufacturerName: [
      '_TZE200_3towulqd', '_TZE204_3towulqd', '_TZE200_ikvncluo',
      '_TZE204_ikvncluo', '_TZE200_7gclukjs', '_TZE204_7gclukjs'
    ],
    productId: ['TS0601']
  },
  // Contact sensor
  'contact_sensor': {
    manufacturerName: [
      '_TZ3000_402jjyro', '_TZ3000_j37j4xtv', '_TZ3000_kd7nnban',
      '_TYZB01_xph99wvr', '_TZ3000_26fmuppg', '_TZ3000_nkl1wxia'
    ],
    productId: ['TS0203']
  },
  // Vibration sensor
  'vibration_sensor': {
    manufacturerName: ['_TYZB01_kulduhbj', '_TZ3000_hktqahrq', '_TZ3000_a4ouv4qs'],
    productId: ['TS0210']
  },
  // Smoke detector
  'smoke_detector': {
    manufacturerName: ['_TZE200_ntcy3xu1', '_TZE200_t5p1vj8r', '_TZE204_ntcy3xu1'],
    productId: ['TS0601']
  },
  // Water leak
  'water_leak_sensor': {
    manufacturerName: [
      '_TZ3000_upgcbody', '_TYZB01_a7sghmms', '_TYZB01_sqmd19i1',
      '_TZ3000_kstbkt6a', '_TZ3000_e6ekbxts'
    ],
    productId: ['TS0207']
  },
  // Thermostat/TRV
  'thermostat': {
    manufacturerName: [
      '_TZE200_ztvwu4nk', '_TZE200_ye5jkfsb', '_TZE200_hue3yfsn',
      '_TZE200_0j6pth9y', '_TZE204_ztvwu4nk'
    ],
    productId: ['TS0601']
  },
  // Wall switch 1 gang
  'wall_switch_1gang': {
    manufacturerName: [
      '_TYZB01_qm6djpta', '_TZ3000_tqlv4ug4', '_TZ3000_2mb38mf3',
      '_TZ3000_qlai3277', '_TZ3000_b3mgfu0d'
    ],
    productId: ['TS0011']
  },
  // Wall switch 2 gang
  'wall_switch_2gang': {
    manufacturerName: [
      '_TZ3000_18ejxno0', '_TZ3000_owmlbbs0', '_TZ3000_tqlv4ug4',
      '_TYZB01_qm6djpta', '_TZ3000_m5bzwpoh'
    ],
    productId: ['TS0012']
  },
  // Wall switch 3 gang
  'wall_switch_3gang': {
    manufacturerName: [
      '_TZ3000_18ejxno0', '_TZ3000_nsar4ife', '_TZ3000_qqrfzboe',
      '_TZ3000_rrjhbuyn', '_TZ3000_mwmcqmtb'
    ],
    productId: ['TS0013']
  },
  // Scene switch 4 gang  
  'button_scene_switch_4gang': {
    manufacturerName: ['_TZ3000_2ei1fkwb', '_TZ3000_dfgbtub0', '_TZ3000_hy5lggkg'],
    productId: ['TS0044']
  },
  // Power strip
  'power_strip': {
    manufacturerName: [
      '_TZ3000_1hwjutgo', '_TZ3000_zmy4lslw', '_TZ3000_u5u0drof',
      '_TZ3000_kstbkt6a'
    ],
    productId: ['TS011F']
  },
  // Smart plug
  'smart_plug': {
    manufacturerName: [
      '_TZ3000_hdopuwv6', '_TZ3000_oxslv1c9', '_TZ3000_8nkb7mof',
      '_TYZB01_iuepbmpv', '_TZ3000_zmy4lslw'
    ],
    productId: ['TS011F']
  },
  // Dimmer
  'dimmer_wall_1gang': {
    manufacturerName: [
      '_TZE200_9i9dt8is', '_TZE200_dfxkcots', '_TZE200_nue3fvem',
      '_TZE200_vmcgja59', '_TZE204_9i9dt8is'
    ],
    productId: ['TS0601']
  },
  // Curtain motor
  'curtain_motor': {
    manufacturerName: [
      '_TZE200_fzo2pocs', '_TZE200_3i3exuay', '_TZE200_zpzndjez',
      '_TZE200_cowvfni3', '_TZE204_fzo2pocs'
    ],
    productId: ['TS0601']
  },
  // RGB bulb
  'bulb_rgb': {
    manufacturerName: [
      '_TZ3000_4g7vxuqk', '_TZ3000_dbou1ap4', '_TZ3000_mn9k8nhm',
      '_TZ3000_oborybow', '_TZ3000_rnnzvseu'
    ],
    productId: ['TS0503B', 'TS0504B']
  },
  // RGBW bulb
  'bulb_rgbw': {
    manufacturerName: [
      '_TZ3000_inejxewm', '_TZ3000_i5gv74od', '_TZ3000_hhbizuqb',
      '_TYZB01_freedyfyq'
    ],
    productId: ['TS0505B', 'TS0504B']
  },
  // Temperature/humidity sensor
  'temp_humid_sensor': {
    manufacturerName: [
      '_TZ3000_bguser20', '_TZA226_ueagguan', '_TYZB01_a082h2cc',
      '_TZ3000_fllyghyj', '_TZ3000_rufdtfyv'
    ],
    productId: ['TS0201']
  },
  // CO2 sensor
  'co2_sensor': {
    manufacturerName: ['_TZE200_8ikyd92m', '_TZE204_8ikyd92m', '_TZE200_yvx5lh6k'],
    productId: ['TS0601']
  }
};

// === EXECUTION ===
console.log('=== INJECT FINGERPRINTS FROM ISSUES ===\n');

let injected = 0;
let notFound = [];
let alreadyHad = [];

// Injecter les fingerprints des issues
FINGERPRINTS_FROM_ISSUES.forEach(fp => {
  const composePath = path.join(DRIVERS_DIR, fp.driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) {
    console.log(`  ✗ Driver non trouvé: ${fp.driverId}`);
    notFound.push(fp.driverId);
    return;
  }
  
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  if (!compose.zigbee) compose.zigbee = {};
  
  const existingMf = compose.zigbee.manufacturerName || [];
  const existingPid = compose.zigbee.productId || [];
  
  // Merge des fingerprints (sans doublons)
  const newMf = [...new Set([...existingMf, ...fp.manufacturerName])];
  const newPid = [...new Set([...existingPid, ...fp.productId])];
  
  const changed = JSON.stringify(newMf) !== JSON.stringify(existingMf) || 
                  JSON.stringify(newPid) !== JSON.stringify(existingPid);
  
  if (!changed) {
    alreadyHad.push(fp.driverId);
    return;
  }
  
  compose.zigbee.manufacturerName = newMf;
  compose.zigbee.productId = newPid;
  
  fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
  console.log(`  ✓ ${fp.driverId}: +${fp.manufacturerName.length} MF, +${fp.productId.length} PID (${fp.note})`);
  injected++;
});

// Injecter les bulk fingerprints
console.log('\nBulk fingerprints injection...');
Object.entries(BULK_FINGERPRINTS).forEach(([driverId, fp]) => {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) {
    notFound.push(driverId);
    return;
  }
  
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  if (!compose.zigbee) return; // Skip non-Zigbee drivers
  
  const existingMf = compose.zigbee.manufacturerName || [];
  const existingPid = compose.zigbee.productId || [];
  
  const newMf = [...new Set([...existingMf, ...fp.manufacturerName])];
  const newPid = [...new Set([...existingPid, ...fp.productId])];
  
  const changed = JSON.stringify(newMf) !== JSON.stringify(existingMf) || 
                  JSON.stringify(newPid) !== JSON.stringify(existingPid);
  
  if (!changed) {
    alreadyHad.push(driverId);
    return;
  }
  
  compose.zigbee.manufacturerName = newMf;
  compose.zigbee.productId = newPid;
  
  fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
  console.log(`  ✓ ${driverId}: MF=${newMf.length}, PID=${newPid.length}`);
  injected++;
});

console.log('\n=== RÉSUMÉ ===');
console.log(`Fingerprints injectés: ${injected} drivers`);
console.log(`Drivers non trouvés: ${notFound.length}`, notFound.length > 0 ? notFound.join(', ') : '');
console.log(`Déjà à jour: ${alreadyHad.length}`);
console.log('\nProchain: node scripts/rebuild-app-json-from-compose.js');
