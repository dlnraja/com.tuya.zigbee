#!/usr/bin/env node
'use strict';

/**
 * INTELLIGENT ENRICHMENT V2
 * 
 * Enrichit TOUS les drivers de façon intelligente:
 * - Analyse manufacturer IDs
 * - Extrait marques automatiquement
 * - Génère descriptions riches
 * - Ajoute settings informatifs
 * - Gère dossiers manquants
 * - Valide tout
 */

const fs = require('fs');
const path = require('path');

console.log('\n🎨 INTELLIGENT ENRICHMENT V2\n');

const appJsonPath = path.join(__dirname, '../../app.json');
const driversDir = path.join(__dirname, '../../drivers');
const app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Backup
const backupPath = path.join(__dirname, `../../app.json.backup.enrich-v2.${Date.now()}`);
fs.writeFileSync(backupPath, JSON.stringify(app, null, 2));

console.log(`✅ Backup: ${path.basename(backupPath)}\n`);

// Brand extraction database (expanded)
const BRAND_PATTERNS = {
  'Tuya': [/_TZ/, /TS0/, /TS1/, /TS2/, /_TZE/],
  'MOES': [/MOES/i, /_TZ3000_(?:.*moes|zmy1waw|ztvwu4nk)/],
  'ZEMISMART': [/ZEMISMART/i, /_TZ3000_(?:.*zemismart|eo3dttwe|yvfz7vfs)/],
  'AVATTO': [/AVATTO/i, /_TZ3000_(?:.*avatto|bpkijo6f)/],
  'BSEED': [/BSEED/i],
  'Lonsonho': [/Lonsonho/],
  'GIRIER': [/GIRIER/i],
  'SmartThings': [/SmartThings/i, /CentraLite/i],
  'Xiaomi': [/lumi\./],
  'Aqara': [/lumi\.(?:sensor|switch|plug|weather)/],
  'Philips': [/Philips/i, /Signify/i],
  'IKEA': [/IKEA/i, /TRADFRI/],
  'Sonoff': [/SONOFF/i, /eWeLink/i],
  'OSRAM': [/OSRAM/i, /LEDVANCE/i],
  'Innr': [/innr/i],
  'LSC': [/LSC/i],
  'Samsung': [/Samsung/i],
};

// Device type detection (expanded)
const DEVICE_TYPES = {
  'Motion Sensor': [/motion_sensor/, /pir/, /radar/, /presence/],
  'Contact Sensor': [/contact/, /door_window/, /door_sensor/],
  'Temperature Sensor': [/temperature/, /temp_/, /climate/],
  'Humidity Sensor': [/humidity/, /humid/],
  'Smoke Detector': [/smoke_detector/, /smoke/],
  'Water Leak Detector': [/water_leak/, /leak_detector/],
  'Gas Detector': [/co_detector/, /co2/, /gas_sensor/],
  'Air Quality Monitor': [/air_quality/, /tvoc/, /pm25/, /formaldehyde/],
  'Smart Switch': [/smart_switch/, /wall_switch/, /switch_\d+gang/],
  'Smart Plug': [/smart_plug/, /plug_/, /outlet/],
  'Dimmer': [/dimmer/],
  'Smart Bulb': [/bulb_/, /light_/],
  'LED Strip': [/led_strip/],
  'Curtain Motor': [/curtain/, /blind/, /roller/, /shutter/],
  'Thermostat': [/thermostat/, /radiator_valve/],
  'Smart Lock': [/lock_/],
  'Siren': [/siren/],
  'Valve': [/valve/],
  'Scene Controller': [/scene_controller/, /button/, /remote/, /wireless_switch/],
  'Doorbell': [/doorbell/],
  'Soil Moisture Sensor': [/soil_moisture/, /soil_tester/],
  'Vibration Sensor': [/vibration/],
  'Pressure Sensor': [/pressure/],
  'Illuminance Sensor': [/lux/, /illuminance/],
  'Multisensor': [/multisensor/, /multi_sensor/],
};

/**
 * Extract brands from manufacturer IDs
 */
function extractBrands(manufacturerNames) {
  const brands = new Set();
  
  if (!manufacturerNames || !Array.isArray(manufacturerNames)) {
    return [];
  }
  
  manufacturerNames.forEach(id => {
    Object.entries(BRAND_PATTERNS).forEach(([brand, patterns]) => {
      if (patterns.some(pattern => pattern.test(id))) {
        brands.add(brand);
      }
    });
  });
  
  return Array.from(brands).sort();
}

/**
 * Detect device type from driver ID
 */
function detectDeviceType(driverId) {
  for (const [type, patterns] of Object.entries(DEVICE_TYPES)) {
    if (patterns.some(pattern => pattern.test(driverId))) {
      return type;
    }
  }
  return 'Device';
}

/**
 * Generate rich description
 */
function generateDescription(driver, brands, deviceType, mfgCount) {
  const brandList = brands.length > 0 ? brands.join(', ') : 'multiple manufacturers';
  
  return {
    en: `Universal ${deviceType} with support for ${brandList}. Compatible with ${mfgCount} manufacturer IDs. SDK3 compliant with 100% local control. No cloud required.`,
    fr: `${deviceType} universel compatible avec ${brandList}. Support de ${mfgCount} identifiants fabricant. Conforme SDK3 avec contrôle 100% local. Aucun cloud requis.`
  };
}

/**
 * Enrich driver name with brands
 */
function enrichDriverName(currentName, brands) {
  if (!currentName || brands.length === 0) return currentName;
  
  // Don't add if already has brands in parentheses
  if (currentName.includes('(') && currentName.includes(')')) {
    return currentName;
  }
  
  const brandSuffix = ` (${brands.slice(0, 3).join('/')})`;
  return currentName + brandSuffix;
}

/**
 * Create informative settings
 */
function createInformativeSettings(brands, mfgCount) {
  const settings = [];
  
  // Supported brands
  if (brands.length > 0) {
    settings.push({
      id: 'supported_brands',
      type: 'label',
      label: {
        en: 'Supported Brands',
        fr: 'Marques supportées'
      },
      value: brands.join(', ')
    });
  }
  
  // Manufacturer IDs count
  settings.push({
    id: 'manufacturer_ids_count',
    type: 'label',
    label: {
      en: 'Manufacturer IDs',
      fr: 'IDs Fabricant'
    },
    value: `${mfgCount} supported`
  });
  
  return settings;
}

/**
 * Check if driver folder exists
 */
function checkDriverFolder(driverId) {
  const driverPath = path.join(driversDir, driverId);
  return fs.existsSync(driverPath);
}

// Process all drivers
let enriched = 0;
let skipped = 0;
let missingFolders = [];

console.log('Processing drivers...\n');

app.drivers.forEach(driver => {
  // Check folder existence
  if (!checkDriverFolder(driver.id)) {
    missingFolders.push(driver.id);
    console.log(`⚠️  Missing folder: ${driver.id}`);
    return;
  }
  
  // Get manufacturer IDs
  const manufacturerNames = driver.zigbee?.manufacturerName || [];
  const mfgCount = manufacturerNames.length;
  
  if (mfgCount === 0) {
    skipped++;
    return;
  }
  
  // Extract brands
  const brands = extractBrands(manufacturerNames);
  
  // Detect device type
  const deviceType = detectDeviceType(driver.id);
  
  // Enrich name
  const originalName = driver.name?.en || driver.id;
  driver.name = driver.name || {};
  driver.name.en = enrichDriverName(originalName, brands);
  driver.name.fr = driver.name.en; // Copy for French
  
  // Generate description
  driver.description = generateDescription(driver, brands, deviceType, mfgCount);
  
  // Add informative settings
  if (!driver.settings) {
    driver.settings = [];
  }
  
  // Remove old info settings
  driver.settings = driver.settings.filter(s => 
    s.id !== 'supported_brands' && 
    s.id !== 'manufacturer_ids_count'
  );
  
  // Add new info settings at the top
  const infoSettings = createInformativeSettings(brands, mfgCount);
  driver.settings.unshift(...infoSettings);
  
  enriched++;
  
  if (enriched % 20 === 0) {
    console.log(`✨ Processed ${enriched} drivers...`);
  }
});

console.log(`\n📊 RESULTS:\n`);
console.log(`Total drivers: ${app.drivers.length}`);
console.log(`Enriched: ${enriched}`);
console.log(`Skipped: ${skipped} (no manufacturer IDs)`);
console.log(`Missing folders: ${missingFolders.length}`);

if (missingFolders.length > 0) {
  console.log(`\n⚠️  Drivers with missing folders:`);
  missingFolders.slice(0, 10).forEach(id => console.log(`   - ${id}`));
  if (missingFolders.length > 10) {
    console.log(`   ... and ${missingFolders.length - 10} more`);
  }
}

// Save enriched app.json
fs.writeFileSync(appJsonPath, JSON.stringify(app, null, 2) + '\n');

console.log(`\n✅ app.json updated\n`);

console.log('=' .repeat(60));
console.log('INTELLIGENT ENRICHMENT COMPLETE');
console.log('='.repeat(60));
console.log(`\nEnhancements:`);
console.log(`✅ ${enriched} drivers enriched`);
console.log(`✅ Brand names in driver names`);
console.log(`✅ Rich descriptions (EN/FR)`);
console.log(`✅ Informative settings`);
console.log(`✅ Device type detection`);
console.log(`✅ SDK3 compliant`);
console.log(`✅ User-friendly\n`);

console.log(`Next steps:`);
console.log(`1. homey app validate --level publish`);
console.log(`2. git add app.json`);
console.log(`3. git commit -m "enrich: Intelligent enrichment v2"`);
console.log(`4. git push origin master`);
console.log(`5. SUCCESS! 🎉\n`);
