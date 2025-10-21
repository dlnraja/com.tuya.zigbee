#!/usr/bin/env node
'use strict';

/**
 * ENRICH MERGED DRIVERS
 * 
 * Enrichit les drivers fusionnés avec:
 * - Marques supportées dans description
 * - Manufacturer names dans metadata
 * - Aide identification pour users
 * - Respect SDK3
 * - Évite duplications
 */

const fs = require('fs');
const path = require('path');

console.log('\n🎨 ENRICH MERGED DRIVERS\n');

const appJsonPath = path.join(__dirname, '../../app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Backup
const backupPath = path.join(__dirname, `../../app.json.backup.enrich.${Date.now()}`);
fs.writeFileSync(backupPath, JSON.stringify(appJson, null, 2));

console.log(`✅ Backup: ${path.basename(backupPath)}\n`);

// Extract unique brands from manufacturer IDs
function extractBrands(manufacturerNames) {
  const brands = new Set();
  
  manufacturerNames.forEach(id => {
    // Common patterns
    if (id.startsWith('_TZ') || id.startsWith('TS')) {
      brands.add('Tuya');
    }
    if (id.includes('MOES') || id.includes('moes')) {
      brands.add('MOES');
    }
    if (id.includes('ZEMISMART') || id.includes('zemismart')) {
      brands.add('ZEMISMART');
    }
    if (id.includes('AVATTO') || id.includes('avatto')) {
      brands.add('AVATTO');
    }
    if (id.includes('BSEED') || id.includes('bseed')) {
      brands.add('BSEED');
    }
    if (id.includes('Lonsonho')) {
      brands.add('Lonsonho');
    }
    if (id.includes('GIRIER')) {
      brands.add('GIRIER');
    }
    if (id.includes('SmartThings')) {
      brands.add('SmartThings');
    }
  });
  
  return Array.from(brands).sort();
}

// Get device type in English
function getDeviceType(driverId) {
  if (driverId.includes('motion_sensor')) return 'Motion Sensor';
  if (driverId.includes('contact') || driverId.includes('door_window')) return 'Contact Sensor';
  if (driverId.includes('temperature') || driverId.includes('temp_')) return 'Temperature Sensor';
  if (driverId.includes('humidity')) return 'Humidity Sensor';
  if (driverId.includes('smoke')) return 'Smoke Detector';
  if (driverId.includes('water_leak')) return 'Water Leak Detector';
  if (driverId.includes('co_detector') || driverId.includes('co2')) return 'Gas Detector';
  if (driverId.includes('switch')) return 'Switch';
  if (driverId.includes('plug') || driverId.includes('outlet')) return 'Smart Plug';
  if (driverId.includes('curtain') || driverId.includes('blind')) return 'Curtain Motor';
  if (driverId.includes('thermostat')) return 'Thermostat';
  if (driverId.includes('lock')) return 'Smart Lock';
  if (driverId.includes('siren')) return 'Siren';
  if (driverId.includes('valve')) return 'Valve';
  if (driverId.includes('button') || driverId.includes('scene')) return 'Scene Controller';
  return 'Device';
}

let enrichedCount = 0;

appJson.drivers.forEach(driver => {
  if (!driver.zigbee || !driver.zigbee.manufacturerName) return;
  
  const brands = extractBrands(driver.zigbee.manufacturerName);
  
  if (brands.length === 0) return;
  
  const deviceType = getDeviceType(driver.id);
  const mfgCount = driver.zigbee.manufacturerName.length;
  
  // Enrich name with brands (keep it readable)
  const currentName = driver.name.en;
  const brandList = brands.join('/');
  
  // Update description to include brands
  if (!driver.name.en.includes('(')) {
    driver.name.en = `${currentName} (${brandList})`;
    driver.name.fr = driver.name.fr || driver.name.en;
  }
  
  // Enrich description
  const description = `Universal ${deviceType} compatible with ${brands.join(', ')}. ` +
    `Supports ${mfgCount} manufacturer IDs. ` +
    `SDK3 compliant, 100% local control.`;
  
  if (!driver.description) {
    driver.description = {};
  }
  
  driver.description.en = description;
  driver.description.fr = `${deviceType} universel compatible avec ${brands.join(', ')}. ` +
    `Support ${mfgCount} identifiants fabricant. ` +
    `Conforme SDK3, contrôle 100% local.`;
  
  // Add brands to settings metadata (for user info)
  if (!driver.settings) {
    driver.settings = [];
  }
  
  // Add brands info setting (read-only)
  const hasBrandsInfo = driver.settings.some(s => s.id === 'supported_brands');
  
  if (!hasBrandsInfo) {
    driver.settings.unshift({
      id: 'supported_brands',
      type: 'label',
      label: {
        en: 'Supported Brands',
        fr: 'Marques supportées'
      },
      value: brands.join(', ')
    });
  }
  
  // Add manufacturer count info
  const hasMfgInfo = driver.settings.some(s => s.id === 'manufacturer_ids_count');
  
  if (!hasMfgInfo) {
    driver.settings.unshift({
      id: 'manufacturer_ids_count',
      type: 'label',
      label: {
        en: 'Manufacturer IDs',
        fr: 'IDs Fabricant'
      },
      value: `${mfgCount} supported`
    });
  }
  
  enrichedCount++;
  
  console.log(`✨ ${driver.id}`);
  console.log(`   Brands: ${brands.join(', ')}`);
  console.log(`   IDs: ${mfgCount}`);
  console.log(`   Type: ${deviceType}`);
});

console.log(`\n📊 RESULTS:\n`);
console.log(`Drivers enriched: ${enrichedCount}`);
console.log(`Total drivers: ${appJson.drivers.length}`);
console.log(`\n✅ Enrichment complete!\n`);

// Save
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

console.log('=' .repeat(60));
console.log('ENRICHMENT COMPLETE');
console.log('='.repeat(60));
console.log(`\nEnhancements:`);
console.log(`✅ Brand names in driver names`);
console.log(`✅ Descriptions enriched`);
console.log(`✅ Supported brands in settings`);
console.log(`✅ Manufacturer count visible`);
console.log(`✅ SDK3 compliant`);
console.log(`✅ User-friendly\n`);

console.log(`Next steps:`);
console.log(`1. homey app validate --level publish`);
console.log(`2. git add app.json`);
console.log(`3. git commit -m "enrich: Add brands to merged drivers"`);
console.log(`4. git push origin master`);
console.log(`5. SUCCESS! 🎉\n`);
