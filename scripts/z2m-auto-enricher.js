#!/usr/bin/env node
/**
 * Z2M Auto-Enricher - Adds missing manufacturerNames to drivers
 * Based on Zigbee2MQTT device definitions
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DRIVERS_PATH = path.join(__dirname, '..', 'drivers');
const Z2M_URL = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';

// Device type mappings based on Z2M descriptions
const DEVICE_TYPE_KEYWORDS = {
  'radiator_valve': ['radiator', 'trv', 'thermostatic', 'valve'],
  'thermostat': ['thermostat', 'heating', 'floor heating'],
  'climate_sensor': ['temperature', 'humidity', 'sensor', 'temp'],
  'motion_sensor': ['motion', 'pir', 'occupancy'],
  'presence_sensor_radar': ['presence', 'radar', 'mmwave', 'human'],
  'contact_sensor': ['door', 'window', 'contact', 'magnet'],
  'water_leak_sensor': ['water', 'leak', 'flood'],
  'smoke_detector': ['smoke', 'fire'],
  'gas_sensor': ['gas', 'co2', 'co'],
  'plug_smart': ['plug', 'socket', 'outlet', 'power'],
  'switch_1gang': ['switch', '1 gang', 'single'],
  'switch_2gang': ['2 gang', 'double', 'dual switch'],
  'switch_3gang': ['3 gang', 'triple'],
  'switch_4gang': ['4 gang', 'quad'],
  'dimmer': ['dimmer', 'dim', 'brightness'],
  'bulb_rgb': ['rgb', 'color', 'bulb', 'led', 'light'],
  'curtain_motor': ['curtain', 'blind', 'shade', 'roller', 'cover'],
  'button_wireless_1': ['button', 'remote', '1 button', 'scene switch'],
  'button_wireless_4': ['4 button', '4 gang remote', 'scene controller'],
  'siren': ['siren', 'alarm', 'sound'],
  'ir_blaster': ['ir', 'infrared', 'remote control'],
  'soil_sensor': ['soil', 'plant', 'moisture']
};

// Fetch Z2M content
function fetchZ2M() {
  return new Promise((resolve, reject) => {
    https.get(Z2M_URL, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Parse Z2M for device definitions with their types
function parseZ2MDevices(content) {
  const devices = [];

  // Match device blocks with fingerprint
  const blockRegex = /\{\s*fingerprint:\s*tuya\.fingerprint\(['"](TS\w+)['"]\s*,\s*\[([^\]]+)\]\)[^}]*description:\s*['"]([^'"]+)['"]/gs;
  let match;

  while ((match = blockRegex.exec(content)) !== null) {
    const productId = match[1];
    const manufacturerNames = match[2]
      .split(',')
      .map(s => s.trim().replace(/['"]/g, '').split(' ')[0])
      .filter(s => s.startsWith('_T'));
    const description = match[3].toLowerCase();

    devices.push({ productId, manufacturerNames, description });
  }

  return devices;
}

// Determine best driver for a device based on description
function findBestDriver(description) {
  for (const [driver, keywords] of Object.entries(DEVICE_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (description.includes(keyword)) {
        return driver;
      }
    }
  }
  return null;
}

// Add manufacturerName to driver
function addToDriver(driverName, manufacturerName) {
  const composePath = path.join(DRIVERS_PATH, driverName, 'driver.compose.json');

  if (!fs.existsSync(composePath)) {
    return false;
  }

  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));

    if (!compose.zigbee?.manufacturerName) {
      return false;
    }

    // Check if already exists
    if (compose.zigbee.manufacturerName.includes(manufacturerName)) {
      return false;
    }

    // Add to list
    compose.zigbee.manufacturerName.push(manufacturerName);

    // Write back
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
    return true;
  } catch (e) {
    console.error(`Error updating ${driverName}: ${e.message}`);
    return false;
  }
}

// Load missing manufacturers list
function loadMissing() {
  const missingPath = path.join(__dirname, 'z2m-missing-manufacturers.json');
  if (fs.existsSync(missingPath)) {
    return JSON.parse(fs.readFileSync(missingPath, 'utf8')).missing;
  }
  return [];
}

// Main enrichment function
async function enrich() {
  console.log('🔧 Z2M Auto-Enricher for Universal Tuya Zigbee\n');
  console.log('='.repeat(60));

  const missing = loadMissing();
  console.log(`\n📋 Loaded ${missing.length} missing manufacturerNames`);

  // Clean up manufacturer names (remove comments)
  const cleanMissing = missing.map(m => m.split(' ')[0].trim());

  console.log('\n🌐 Fetching Zigbee2MQTT data...');
  const z2mContent = await fetchZ2M();
  const devices = parseZ2MDevices(z2mContent);
  console.log(`   Found ${devices.length} device definitions`);

  // Build mapping of manufacturerName -> driver
  const enrichments = {};
  let added = 0;
  let skipped = 0;

  for (const mfr of cleanMissing) {
    // Find device info from Z2M
    const device = devices.find(d => d.manufacturerNames.includes(mfr));

    if (device) {
      const driver = findBestDriver(device.description);
      if (driver) {
        if (addToDriver(driver, mfr)) {
          added++;
          if (!enrichments[driver]) enrichments[driver] = [];
          enrichments[driver].push(mfr);
          console.log(`   ✅ Added ${mfr} to ${driver}`);
        }
      } else {
        skipped++;
      }
    } else {
      skipped++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ Enrichment complete!`);
  console.log(`   Added: ${added}`);
  console.log(`   Skipped: ${skipped}`);

  if (Object.keys(enrichments).length > 0) {
    console.log('\n📊 Summary by driver:');
    for (const [driver, mfrs] of Object.entries(enrichments)) {
      console.log(`   ${driver}: +${mfrs.length}`);
    }
  }

  // Save enrichment log
  const logPath = path.join(__dirname, 'z2m-enrichment-log.json');
  fs.writeFileSync(logPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    added,
    skipped,
    enrichments
  }, null, 2));
  console.log(`\n   📄 Log saved to ${logPath}`);
}

enrich().catch(console.error);
