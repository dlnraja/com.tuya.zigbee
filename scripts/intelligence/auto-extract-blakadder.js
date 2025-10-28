#!/usr/bin/env node
/**
 * AUTOMATIC BLAKADDER DATABASE EXTRACTOR
 * 
 * Scrappe: https://zigbee.blakadder.com/
 * 
 * Extrait:
 * - Device specifications complètes
 * - Manufacturer IDs précis
 * - Model numbers
 * - Features et capabilities
 * - Links vers documentation
 * - User reviews et notes
 * 
 * Croise avec Zigbee2MQTT pour DataPoints
 */

'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../../data/extracted');
const CACHE_DIR = path.join(__dirname, '../../.cache');

// Create directories
[OUTPUT_DIR, CACHE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('🔗 AUTOMATIC BLAKADDER EXTRACTOR');
console.log('═════════════════════════════════════\n');

/**
 * Fetch URL content
 */
async function fetchURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HomeyTuyaExtractor/1.0)'
      }
    }, (res) => {
      let data = '';
      
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchURL(res.headers.location).then(resolve).catch(reject);
      }
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Fetch Blakadder Zigbee database JSON
 * Note: Blakadder expose une API JSON non officielle
 */
async function fetchBlakadderDevices() {
  console.log('📥 Fetching Blakadder Zigbee database...');
  
  // Try GitHub raw JSON (if available)
  const urls = [
    'https://raw.githubusercontent.com/blakadder/zigbee/main/_zigbee.json',
    'https://zigbee.blakadder.com/assets/device_repo.json'
  ];
  
  for (const url of urls) {
    try {
      const data = await fetchURL(url);
      const devices = JSON.parse(data);
      
      // Cache it
      const cachePath = path.join(CACHE_DIR, 'blakadder-devices.json');
      fs.writeFileSync(cachePath, JSON.stringify(devices, null, 2));
      
      console.log(`✅ Fetched ${Array.isArray(devices) ? devices.length : Object.keys(devices).length} devices from Blakadder`);
      return devices;
    } catch (err) {
      console.log(`⚠️  Failed URL: ${url} - ${err.message}`);
    }
  }
  
  // Try cache
  const cachePath = path.join(CACHE_DIR, 'blakadder-devices.json');
  if (fs.existsSync(cachePath)) {
    console.log('📂 Using cached Blakadder devices');
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }
  
  console.error('❌ No Blakadder data available');
  return [];
}

/**
 * Parse Blakadder device entry
 */
function parseBlakadderDevice(device) {
  // Blakadder structure varies, normalize it
  return {
    model: device.model || device.Model || device.zigbeeModel,
    vendor: device.vendor || device.Vendor || device.manufacturerName,
    description: device.description || device.Description || device.title,
    image: device.image || device.Image,
    link: device.link || device.Link,
    manufacturerId: device.manufacturerId || device.ManufacturerID || extractManufacturerId(device),
    supported: device.supported || device.Supported,
    exposes: device.exposes || device.Exposes || [],
    features: parseFeatures(device),
    powerSource: device.powerSource || device.PowerSource || determinePowerSource(device),
    notes: device.notes || device.Notes || ''
  };
}

/**
 * Extract manufacturer ID from various fields
 */
function extractManufacturerId(device) {
  const possibleFields = [
    device.manufacturerId,
    device.ManufacturerID,
    device.manufacturer_id,
    device.zigbeeModel,
    device.model
  ];
  
  for (const field of possibleFields) {
    if (!field) continue;
    
    // Tuya manufacturer IDs start with _TZ
    if (typeof field === 'string' && field.startsWith('_TZ')) {
      return field;
    }
    
    // Also check for TS models
    if (typeof field === 'string' && field.startsWith('TS')) {
      return field;
    }
  }
  
  return null;
}

/**
 * Parse device features from description
 */
function parseFeatures(device) {
  const features = [];
  const desc = ((device.description || '') + ' ' + (device.notes || '')).toLowerCase();
  
  const featureKeywords = {
    'temperature': 'measure_temperature',
    'humidity': 'measure_humidity',
    'motion': 'alarm_motion',
    'occupancy': 'alarm_motion',
    'contact': 'alarm_contact',
    'door': 'alarm_contact',
    'window': 'alarm_contact',
    'smoke': 'alarm_smoke',
    'gas': 'alarm_co',
    'water': 'alarm_water',
    'leak': 'alarm_water',
    'power': 'measure_power',
    'energy': 'meter_power',
    'current': 'measure_current',
    'voltage': 'measure_voltage',
    'battery': 'measure_battery',
    'illuminance': 'measure_luminance',
    'lux': 'measure_luminance',
    'brightness': 'dim',
    'dimmer': 'dim',
    'switch': 'onoff',
    'plug': 'onoff',
    'light': 'onoff',
    'thermostat': 'target_temperature',
    'curtain': 'windowcoverings_set',
    'blind': 'windowcoverings_set',
    'button': 'button',
    'remote': 'button'
  };
  
  for (const [keyword, capability] of Object.entries(featureKeywords)) {
    if (desc.includes(keyword)) {
      features.push({
        keyword: keyword,
        capability: capability,
        source: 'description_parsing'
      });
    }
  }
  
  return features;
}

/**
 * Determine power source
 */
function determinePowerSource(device) {
  const desc = ((device.description || '') + ' ' + (device.notes || '')).toLowerCase();
  
  if (desc.includes('battery') || desc.includes('cr2032') || desc.includes('aaa')) {
    return 'battery';
  }
  if (desc.includes('mains') || desc.includes('ac') || desc.includes('plug')) {
    return 'mains';
  }
  if (desc.includes('usb')) {
    return 'usb';
  }
  
  return 'unknown';
}

/**
 * Filter Tuya devices
 */
function filterTuyaDevices(devices) {
  const devicesArray = Array.isArray(devices) ? devices : Object.values(devices);
  
  return devicesArray.filter(device => {
    const parsed = parseBlakadderDevice(device);
    const vendor = (parsed.vendor || '').toLowerCase();
    const model = parsed.model || '';
    const manufacturerId = parsed.manufacturerId || '';
    
    return vendor.includes('tuya') || 
           model.startsWith('TS') || 
           model.startsWith('_TZ') ||
           manufacturerId.startsWith('_TZ');
  });
}

/**
 * Generate technical specification from Blakadder device
 */
function generateTechnicalSpec(device) {
  const parsed = parseBlakadderDevice(device);
  
  return {
    identification: {
      model: parsed.model,
      vendor: parsed.vendor,
      manufacturerId: parsed.manufacturerId,
      description: parsed.description
    },
    capabilities: parsed.features.map(f => f.capability),
    power: {
      source: parsed.powerSource,
      battery: parsed.powerSource === 'battery' ? determineBatteryType(parsed) : null
    },
    features: parsed.features,
    links: {
      blakadder: parsed.link,
      image: parsed.image
    },
    metadata: {
      source: 'blakadder',
      supported: parsed.supported,
      notes: parsed.notes,
      generated: new Date().toISOString()
    }
  };
}

/**
 * Determine battery type from description
 */
function determineBatteryType(device) {
  const desc = (device.description + ' ' + device.notes).toLowerCase();
  
  if (desc.includes('cr2032')) return 'CR2032';
  if (desc.includes('cr2450')) return 'CR2450';
  if (desc.includes('cr123')) return 'CR123A';
  if (desc.includes('aaa')) return 'AAA';
  if (desc.includes('aa') && !desc.includes('aaa')) return 'AA';
  
  return 'INTERNAL';
}

/**
 * Main extraction process
 */
async function main() {
  console.log('🚀 Starting Blakadder extraction...\n');
  
  // Step 1: Fetch Blakadder devices
  const allDevices = await fetchBlakadderDevices();
  
  if (!allDevices || (Array.isArray(allDevices) && allDevices.length === 0)) {
    console.error('❌ No devices fetched');
    process.exit(1);
  }
  
  // Step 2: Filter Tuya devices
  const tuyaDevices = filterTuyaDevices(allDevices);
  console.log(`🔍 Found ${tuyaDevices.length} Tuya devices\n`);
  
  // Step 3: Process each device
  const extracted = [];
  const errors = [];
  
  for (const device of tuyaDevices) {
    try {
      const parsed = parseBlakadderDevice(device);
      console.log(`📦 Processing: ${parsed.model} (${parsed.vendor})`);
      
      const spec = generateTechnicalSpec(device);
      extracted.push(spec);
      
      console.log(`   ✅ Extracted successfully\n`);
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
      errors.push({
        device: device.model || 'unknown',
        error: err.message
      });
    }
  }
  
  // Step 4: Save results
  const outputPath = path.join(OUTPUT_DIR, 'blakadder-extracted.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    generated: new Date().toISOString(),
    source: 'blakadder',
    total: extracted.length,
    devices: extracted,
    errors: errors
  }, null, 2));
  
  console.log('\n═════════════════════════════════════');
  console.log(`✅ Extraction complete!`);
  console.log(`📁 Output: ${outputPath}`);
  console.log(`📊 Devices extracted: ${extracted.length}`);
  console.log(`⚠️  Errors: ${errors.length}`);
  
  // Generate summary
  const summary = {
    byVendor: {},
    byPowerSource: {},
    capabilities: new Set(),
    manufacturerIds: new Set()
  };
  
  extracted.forEach(device => {
    // By vendor
    const vendor = device.identification.vendor;
    summary.byVendor[vendor] = (summary.byVendor[vendor] || 0) + 1;
    
    // By power source
    const power = device.power.source;
    summary.byPowerSource[power] = (summary.byPowerSource[power] || 0) + 1;
    
    // Capabilities
    device.capabilities.forEach(cap => summary.capabilities.add(cap));
    
    // Manufacturer IDs
    if (device.identification.manufacturerId) {
      summary.manufacturerIds.add(device.identification.manufacturerId);
    }
  });
  
  console.log('\n📊 SUMMARY:');
  console.log('  Vendors:', Object.keys(summary.byVendor).length);
  console.log('  Power Sources:', summary.byPowerSource);
  console.log(`  Unique Capabilities: ${summary.capabilities.size}`);
  console.log(`  Unique Manufacturer IDs: ${summary.manufacturerIds.size}`);
  
  const summaryPath = path.join(OUTPUT_DIR, 'blakadder-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    ...summary,
    capabilities: Array.from(summary.capabilities),
    manufacturerIds: Array.from(summary.manufacturerIds)
  }, null, 2));
  
  console.log(`\n📁 Summary: ${summaryPath}`);
}

// Run
main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
