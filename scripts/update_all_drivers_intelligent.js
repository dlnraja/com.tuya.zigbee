#!/usr/bin/env node
'use strict';

/**
 * UPDATE ALL DRIVERS - INTELLIGENT SYSTEM
 * 
 * Met à jour tous les drivers en fonction des devices réels sur le réseau
 * et applique toutes les connaissances acquises (Protocol Router, DP mapping, etc.)
 * 
 * Devices sur le réseau:
 * 1. Switch 2gang - _TZ3000_h1ipgkwn / TS0002
 * 2. 4-Boutons - _TZ3000_bgtzm4ny / TS0044
 * 3. Climate Monitor - _TZE284_vvmbj46n / TS0601
 * 4. 3-Boutons - _TZ3000_bczr4e10 / TS0043
 * 5. SOS Button - _TZ3000_0dumfk2z / TS0215A
 * 6. Presence Sensor - _TZE200_rhgsbacq / TS0601
 * 7. Soil Tester - _TZE284_oitavov2 / TS0601
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP_JSON_PATH = path.join(ROOT, 'app.json');

console.log('🔧 MISE À JOUR INTELLIGENTE DE TOUS LES DRIVERS');
console.log('═══════════════════════════════════════════════════\n');

// Lire app.json
const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

// Backup
const backupPath = APP_JSON_PATH + '.backup-driver-update';
fs.writeFileSync(backupPath, JSON.stringify(appJson, null, 2), 'utf8');
console.log(`✅ Backup: ${backupPath}\n`);

// ============================================================================
// DEVICES SUR LE RÉSEAU - CONFIGURATION INTELLIGENTE
// ============================================================================

const NETWORK_DEVICES = [
  {
    name: 'Switch 2gang',
    manufacturerId: '_TZ3000_h1ipgkwn',
    productId: 'TS0002',
    driverPattern: ['switch_2gang', 'wall_touch_2gang', 'switch_basic_2gang'],
    needsTuyaDP: true, // BSEED-like behavior
    capabilities: ['onoff', 'onoff.2'],
    clusters: [0, 3, 4, 5, 6],
    endpoints: { 1: [0, 3, 4, 5, 6], 2: [0, 4, 5, 6] },
    bindings: { 1: [6], 2: [6] },
    class: 'socket',
    category: 'Smart Lighting'
  },
  {
    name: '4-Boutons Controller',
    manufacturerId: '_TZ3000_bgtzm4ny',
    productId: 'TS0044',
    driverPattern: ['button_wireless_4', 'button_remote_4', 'scene_controller_4'],
    capabilities: ['measure_battery'],
    clusters: [0, 1, 3, 6],
    endpoints: { 1: [0, 1, 3, 6], 2: [6], 3: [6], 4: [6] },
    bindings: { 1: [1, 6], 2: [6], 3: [6], 4: [6] },
    class: 'button',
    category: 'Automation Control',
    batteryType: 'CR2032'
  },
  {
    name: 'Climate Monitor',
    manufacturerId: '_TZE284_vvmbj46n',
    productId: 'TS0601',
    driverPattern: ['climate_sensor', 'temp_humidity', 'climate_monitor'],
    needsTuyaDP: true, // TS0601 = pure Tuya DP
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    clusters: [0, 1, 3, 61184], // 61184 = 0xEF00
    endpoints: { 1: [0, 1, 3, 61184] },
    bindings: { 1: [1] },
    class: 'sensor',
    category: 'Temperature & Climate',
    dpMapping: {
      measure_temperature: { dp: 1, parser: (v) => v / 10 },
      measure_humidity: { dp: 2, parser: (v) => v / 10 },
      measure_battery: { dp: 4, parser: (v) => v }
    }
  },
  {
    name: '3-Boutons Controller',
    manufacturerId: '_TZ3000_bczr4e10',
    productId: 'TS0043',
    driverPattern: ['button_wireless_3', 'button_remote_3', 'scene_controller_3'],
    capabilities: ['measure_battery'],
    clusters: [0, 1, 3, 6],
    endpoints: { 1: [0, 1, 3, 6], 2: [6], 3: [6] },
    bindings: { 1: [1, 6], 2: [6], 3: [6] },
    class: 'button',
    category: 'Automation Control',
    batteryType: 'CR2032'
  },
  {
    name: 'SOS Emergency Button',
    manufacturerId: '_TZ3000_0dumfk2z',
    productId: 'TS0215A',
    driverPattern: ['button_emergency', 'button_sos', 'alarm_button'],
    capabilities: ['alarm_generic', 'measure_battery'],
    clusters: [0, 1, 3, 1280], // 1280 = IAS Zone
    endpoints: { 1: [0, 1, 3, 1280] },
    bindings: { 1: [1, 1280] },
    class: 'button',
    category: 'Safety & Detection',
    iasZone: true,
    batteryType: 'CR2032'
  },
  {
    name: 'Presence Sensor Radar',
    manufacturerId: '_TZE200_rhgsbacq',
    productId: 'TS0601',
    driverPattern: ['presence_sensor', 'radar_sensor', 'motion_presence'],
    needsTuyaDP: true,
    capabilities: ['alarm_motion', 'measure_battery'],
    clusters: [0, 1, 3, 61184],
    endpoints: { 1: [0, 1, 3, 61184] },
    bindings: { 1: [1] },
    class: 'sensor',
    category: 'Motion & Presence',
    dpMapping: {
      alarm_motion: { dp: 1, parser: (v) => Boolean(v) },
      measure_battery: { dp: 4, parser: (v) => v }
    }
  },
  {
    name: 'Soil Tester Temp Humid',
    manufacturerId: '_TZE284_oitavov2',
    productId: 'TS0601',
    driverPattern: ['soil_sensor', 'soil_tester', 'climate_sensor_soil'],
    needsTuyaDP: true,
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    clusters: [0, 1, 3, 61184],
    endpoints: { 1: [0, 1, 3, 61184] },
    bindings: { 1: [1] },
    class: 'sensor',
    category: 'Temperature & Climate',
    dpMapping: {
      measure_temperature: { dp: 5, parser: (v) => v / 10 },
      measure_humidity: { dp: 6, parser: (v) => v / 10 },
      'soil_moisture': { dp: 7, parser: (v) => v },
      measure_battery: { dp: 14, parser: (v) => v }
    }
  }
];

// ============================================================================
// FONCTION: TROUVER OU CRÉER DRIVER
// ============================================================================

function findOrCreateDriver(deviceInfo) {
  console.log(`\n📱 Processing: ${deviceInfo.name}`);
  console.log(`   Manufacturer: ${deviceInfo.manufacturerId}`);
  console.log(`   Product: ${deviceInfo.productId}`);
  
  // Chercher driver existant
  let driver = null;
  for (const pattern of deviceInfo.driverPattern) {
    driver = appJson.drivers.find(d => d.id.includes(pattern));
    if (driver) {
      console.log(`   ✅ Found driver: ${driver.id}`);
      break;
    }
  }
  
  if (!driver) {
    // Créer nouveau driver
    const driverId = deviceInfo.driverPattern[0];
    console.log(`   ⚠️  No driver found, creating: ${driverId}`);
    
    driver = {
      id: driverId,
      name: { en: deviceInfo.name },
      class: deviceInfo.class,
      capabilities: deviceInfo.capabilities,
      energy: {},
      zigbee: {
        manufacturerName: [deviceInfo.manufacturerId],
        productId: [deviceInfo.productId],
        endpoints: deviceInfo.endpoints,
        bindings: deviceInfo.bindings
      },
      images: {
        small: `/drivers/${driverId}/assets/small.png`,
        large: `/drivers/${driverId}/assets/large.png`,
        xlarge: `/drivers/${driverId}/assets/xlarge.png`
      }
    };
    
    appJson.drivers.push(driver);
  }
  
  return driver;
}

// ============================================================================
// FONCTION: ENRICHIR DRIVER
// ============================================================================

function enrichDriver(driver, deviceInfo) {
  let modified = false;
  
  // 1. Ajouter manufacturer ID si manquant
  if (!driver.zigbee) driver.zigbee = {};
  if (!driver.zigbee.manufacturerName) driver.zigbee.manufacturerName = [];
  
  if (!driver.zigbee.manufacturerName.includes(deviceInfo.manufacturerId)) {
    driver.zigbee.manufacturerName.push(deviceInfo.manufacturerId);
    console.log(`   ✅ Added manufacturer: ${deviceInfo.manufacturerId}`);
    modified = true;
  }
  
  // 2. Ajouter product ID si manquant
  if (!driver.zigbee.productId) driver.zigbee.productId = [];
  if (!driver.zigbee.productId.includes(deviceInfo.productId)) {
    driver.zigbee.productId.push(deviceInfo.productId);
    console.log(`   ✅ Added product: ${deviceInfo.productId}`);
    modified = true;
  }
  
  // 3. Mettre à jour endpoints
  if (deviceInfo.endpoints) {
    driver.zigbee.endpoints = deviceInfo.endpoints;
    console.log(`   ✅ Updated endpoints`);
    modified = true;
  }
  
  // 4. Mettre à jour bindings
  if (deviceInfo.bindings) {
    driver.zigbee.bindings = deviceInfo.bindings;
    console.log(`   ✅ Updated bindings`);
    modified = true;
  }
  
  // 5. Ajouter capabilities manquantes
  if (!driver.capabilities) driver.capabilities = [];
  for (const cap of deviceInfo.capabilities) {
    if (!driver.capabilities.includes(cap)) {
      driver.capabilities.push(cap);
      console.log(`   ✅ Added capability: ${cap}`);
      modified = true;
    }
  }
  
  // 6. Configurer energy pour battery
  if (deviceInfo.batteryType && driver.capabilities.includes('measure_battery')) {
    if (!driver.energy) driver.energy = {};
    if (!driver.energy.batteries) {
      driver.energy.batteries = [deviceInfo.batteryType];
      console.log(`   ✅ Added battery type: ${deviceInfo.batteryType}`);
      modified = true;
    }
  }
  
  // 7. Ajouter settings pour DP devices
  if (deviceInfo.dpMapping) {
    if (!driver.settings) driver.settings = [];
    
    // Setting pour debug DP
    const dpDebugSetting = {
      id: 'dp_debug_mode',
      type: 'checkbox',
      label: { en: 'DP Debug Mode' },
      value: false,
      hint: { en: 'Enable detailed Tuya DataPoint logging' }
    };
    
    if (!driver.settings.find(s => s.id === 'dp_debug_mode')) {
      driver.settings.push(dpDebugSetting);
      console.log(`   ✅ Added DP debug setting`);
      modified = true;
    }
  }
  
  // 8. Ajouter metadata Tuya DP
  if (deviceInfo.needsTuyaDP) {
    if (!driver.zigbee.tuyaDP) {
      driver.zigbee.tuyaDP = true;
      console.log(`   ✅ Marked as Tuya DP device`);
      modified = true;
    }
  }
  
  // 9. Ajouter metadata IAS Zone
  if (deviceInfo.iasZone) {
    if (!driver.zigbee.iasZone) {
      driver.zigbee.iasZone = true;
      console.log(`   ✅ Marked as IAS Zone device`);
      modified = true;
    }
  }
  
  return modified;
}

// ============================================================================
// TRAITER TOUS LES DEVICES
// ============================================================================

console.log('═══════════════════════════════════════════════════');
console.log('TRAITEMENT DES 7 DEVICES SUR LE RÉSEAU');
console.log('═══════════════════════════════════════════════════');

let totalModified = 0;

for (const deviceInfo of NETWORK_DEVICES) {
  const driver = findOrCreateDriver(deviceInfo);
  const modified = enrichDriver(driver, deviceInfo);
  
  if (modified) {
    totalModified++;
  }
}

// ============================================================================
// SAUVEGARDER
// ============================================================================

fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2) + '\n', 'utf8');

console.log('\n═══════════════════════════════════════════════════');
console.log('✅ MISE À JOUR TERMINÉE');
console.log('═══════════════════════════════════════════════════\n');

console.log(`Drivers modifiés: ${totalModified}/${NETWORK_DEVICES.length}`);
console.log(`Total drivers: ${appJson.drivers.length}`);
console.log(`\nBackup: ${backupPath}\n`);

// ============================================================================
// CRÉER DEVICE.JS TEMPLATES POUR LES TS0601
// ============================================================================

console.log('═══════════════════════════════════════════════════');
console.log('CRÉATION DEVICE.JS POUR TS0601 DEVICES');
console.log('═══════════════════════════════════════════════════\n');

const ts0601Devices = NETWORK_DEVICES.filter(d => d.needsTuyaDP && d.dpMapping);

for (const deviceInfo of ts0601Devices) {
  const driverId = deviceInfo.driverPattern[0];
  const driverPath = path.join(ROOT, 'drivers', driverId);
  const deviceJsPath = path.join(driverPath, 'device.js');
  
  // Vérifier si dossier existe
  if (!fs.existsSync(driverPath)) {
    fs.mkdirSync(driverPath, { recursive: true });
    console.log(`✅ Created driver folder: ${driverId}`);
  }
  
  // Créer device.js si n'existe pas ou est vieux
  let createFile = false;
  if (!fs.existsSync(deviceJsPath)) {
    createFile = true;
  } else {
    const content = fs.readFileSync(deviceJsPath, 'utf8');
    if (!content.includes('TuyaDataPointEngine') && !content.includes('dpMapping')) {
      createFile = true;
      fs.writeFileSync(deviceJsPath + '.backup', content, 'utf8');
      console.log(`   📦 Backed up old: ${driverId}/device.js`);
    }
  }
  
  if (createFile) {
    const deviceJsContent = generateTS0601DeviceJs(deviceInfo);
    fs.writeFileSync(deviceJsPath, deviceJsContent, 'utf8');
    console.log(`✅ Created/Updated: ${driverId}/device.js`);
  } else {
    console.log(`   ℹ️  Already up-to-date: ${driverId}/device.js`);
  }
}

console.log('\n✅ Tous les device.js créés/mis à jour\n');

// ============================================================================
// FONCTION: GÉNÉRER DEVICE.JS POUR TS0601
// ============================================================================

function generateTS0601DeviceJs(deviceInfo) {
  const dpMappingStr = JSON.stringify(deviceInfo.dpMapping, null, 4)
    .replace(/"([^"]+)":/g, '$1:') // Remove quotes from keys
    .replace(/: function/g, ':'); // Clean up function syntax
  
  return `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaDataPointEngine = require('../../lib/TuyaDataPointEngine');

/**
 * ${deviceInfo.name}
 * 
 * Manufacturer: ${deviceInfo.manufacturerId}
 * Product ID: ${deviceInfo.productId}
 * Type: TS0601 (Pure Tuya DP device)
 * 
 * Protocol: Uses Tuya DataPoints (DP) over cluster 0xEF00
 * This device does NOT use standard Zigbee clusters for sensors.
 * All data is transmitted via Tuya proprietary DP protocol.
 */
class ${toCamelCase(deviceInfo.driverPattern[0])}Device extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.log('${deviceInfo.name} initializing...');
    this.log('Manufacturer:', '${deviceInfo.manufacturerId}');
    this.log('Product:', '${deviceInfo.productId}');
    
    // Get Tuya cluster (0xEF00 = 61184)
    const endpoint = zclNode.endpoints[1];
    if (!endpoint) {
      throw new Error('Endpoint 1 not found');
    }
    
    const tuyaCluster = endpoint.clusters.tuyaManufacturer 
                     || endpoint.clusters.tuyaSpecific
                     || endpoint.clusters.manuSpecificTuya
                     || endpoint.clusters[0xEF00]
                     || endpoint.clusters[61184];
    
    if (!tuyaCluster) {
      throw new Error('Tuya cluster not found - this is a TS0601 device and requires cluster 0xEF00');
    }
    
    this.log('✅ Tuya cluster found');
    
    // Initialize Tuya DataPoint Engine
    this.dpEngine = new TuyaDataPointEngine(this, tuyaCluster);
    
    // DP Mapping for this device
    const dpMapping = ${dpMappingStr};
    
    this.log('📋 DP Mapping:', JSON.stringify(dpMapping, null, 2));
    
    // Setup DP listeners
    await this.dpEngine.setupDataPoints(dpMapping);
    
    this.log('✅ ${deviceInfo.name} initialized with Tuya DP Engine');
    
    // Mark available
    await this.setAvailable();
  }
  
  /**
   * Called when device is deleted
   */
  async onDeleted() {
    this.log('${deviceInfo.name} deleted');
  }
}

module.exports = ${toCamelCase(deviceInfo.driverPattern[0])}Device;
`;
}

function toCamelCase(str) {
  return str.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

console.log('═══════════════════════════════════════════════════');
console.log('✅ SCRIPT TERMINÉ AVEC SUCCÈS');
console.log('═══════════════════════════════════════════════════\n');

console.log('Prochaines étapes:');
console.log('  1. Vérifier les drivers dans app.json');
console.log('  2. Vérifier les device.js créés');
console.log('  3. Tester avec: npx homey app validate');
console.log('  4. Commit les changements\n');
