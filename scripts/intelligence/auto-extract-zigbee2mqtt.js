#!/usr/bin/env node
/**
 * AUTOMATIC ZIGBEE2MQTT EXTRACTOR
 * 
 * Scrappe automatiquement:
 * - https://www.zigbee2mqtt.io/supported-devices/
 * - https://github.com/Koenkk/zigbee2mqtt (converters)
 * - https://zigbee.blakadder.com
 * 
 * Extrait et convertit en configuration technique:
 * - Tuya DataPoints (DPs)
 * - Ranges et limites
 * - Features disponibles
 * - Manufacturer IDs
 * - Capabilities mappings
 * 
 * Auto-génère: drivers JSON configurés
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

console.log('🤖 AUTOMATIC ZIGBEE2MQTT EXTRACTOR');
console.log('═════════════════════════════════════\n');

/**
 * Fetch URL content
 */
async function fetchURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
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
 * Fetch Zigbee2MQTT supported devices JSON
 */
async function fetchZ2MDevices() {
  console.log('📥 Fetching Zigbee2MQTT devices database...');
  
  const url = 'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt.io/master/public/supported-devices.json';
  
  try {
    const data = await fetchURL(url);
    const devices = JSON.parse(data);
    
    // Cache it
    const cachePath = path.join(CACHE_DIR, 'z2m-devices.json');
    fs.writeFileSync(cachePath, JSON.stringify(devices, null, 2));
    
    console.log(`✅ Fetched ${devices.length} devices from Z2M`);
    return devices;
  } catch (err) {
    console.error(`❌ Failed to fetch Z2M devices: ${err.message}`);
    
    // Try cache
    const cachePath = path.join(CACHE_DIR, 'z2m-devices.json');
    if (fs.existsSync(cachePath)) {
      console.log('📂 Using cached Z2M devices');
      return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    }
    
    return [];
  }
}

/**
 * Fetch Z2M converter for specific device
 */
async function fetchZ2MConverter(model) {
  const baseURL = 'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt/master/src/devices/';
  
  // Try common paths
  const paths = [
    'tuya.ts',
    'xiaomi.ts',
    'aqara.ts',
    'philips.ts'
  ];
  
  for (const filepath of paths) {
    try {
      const url = baseURL + filepath;
      const content = await fetchURL(url);
      
      // Search for model in content
      if (content.includes(model)) {
        return {
          file: filepath,
          content: content
        };
      }
    } catch (err) {
      // Continue to next file
    }
  }
  
  return null;
}

/**
 * Extract DataPoints from Z2M converter
 */
function extractDataPoints(converterContent, model) {
  const datapoints = [];
  
  // Pattern: [DP_NUMBER, 'name', converter]
  const dpPattern = /\[(\d+),\s*['"]([^'"]+)['"],\s*tuya\.valueConverter\.(\w+)/g;
  
  let match;
  while ((match = dpPattern.exec(converterContent)) !== null) {
    const [, dp, name, converter] = match;
    
    datapoints.push({
      dp: parseInt(dp),
      name: name,
      converter: converter,
      source: 'zigbee2mqtt'
    });
  }
  
  return datapoints;
}

/**
 * Extract Tuya devices from Z2M
 */
function filterTuyaDevices(devices) {
  return devices.filter(device => {
    const vendor = (device.vendor || '').toLowerCase();
    const model = device.model || '';
    
    return vendor.includes('tuya') || 
           model.startsWith('TS') || 
           model.startsWith('_TZ');
  });
}

/**
 * Parse device capabilities from Z2M exposes
 */
function parseCapabilities(exposes) {
  if (!exposes || !Array.isArray(exposes)) return [];
  
  const capabilities = [];
  
  for (const expose of exposes) {
    const feature = {
      name: expose.name,
      type: expose.type,
      property: expose.property,
      access: expose.access, // 1=read, 2=write, 3=read+write
      description: expose.description
    };
    
    // Add value constraints
    if (expose.value_min !== undefined) feature.min = expose.value_min;
    if (expose.value_max !== undefined) feature.max = expose.value_max;
    if (expose.value_step !== undefined) feature.step = expose.value_step;
    if (expose.unit) feature.unit = expose.unit;
    if (expose.values) feature.values = expose.values;
    
    // Map to Homey capability
    feature.homey_capability = mapZ2MToHomeyCapability(expose);
    
    capabilities.push(feature);
  }
  
  return capabilities;
}

/**
 * Map Z2M expose to Homey capability
 */
function mapZ2MToHomeyCapability(expose) {
  const mapping = {
    'state': 'onoff',
    'brightness': 'dim',
    'color_temp': 'light_temperature',
    'color_hs': ['light_hue', 'light_saturation'],
    'power': 'measure_power',
    'current': 'measure_current',
    'voltage': 'measure_voltage',
    'energy': 'meter_power',
    'temperature': 'measure_temperature',
    'humidity': 'measure_humidity',
    'battery': 'measure_battery',
    'occupancy': 'alarm_motion',
    'contact': 'alarm_contact',
    'water_leak': 'alarm_water',
    'smoke': 'alarm_smoke',
    'gas': 'alarm_co',
    'position': 'windowcoverings_set',
    'illuminance': 'measure_luminance',
    'illuminance_lux': 'measure_luminance',
    'co2': 'measure_co2',
    'pm25': 'measure_pm25',
    'voc': 'measure_voc'
  };
  
  return mapping[expose.property] || expose.property;
}

/**
 * Generate driver configuration from Z2M device
 */
function generateDriverConfig(device, capabilities) {
  const config = {
    id: generateDriverId(device),
    name: device.description || device.model,
    class: determineDeviceClass(device, capabilities),
    capabilities: capabilities
      .filter(c => c.homey_capability)
      .map(c => c.homey_capability)
      .flat(),
    energy: determineEnergy(device, capabilities),
    zigbee: {
      manufacturerName: [device.vendor],
      productId: [device.model],
      endpoints: extractEndpoints(device),
      learnmode: {
        instruction: {
          en: "Follow device pairing instructions"
        }
      }
    },
    metadata: {
      source: 'zigbee2mqtt',
      model: device.model,
      vendor: device.vendor,
      description: device.description,
      supports: device.supports || [],
      generated: new Date().toISOString()
    }
  };
  
  return config;
}

/**
 * Generate driver ID from device info
 */
function generateDriverId(device) {
  const model = (device.model || '').toLowerCase();
  const desc = (device.description || '').toLowerCase();
  
  // Determine type
  let type = 'unknown';
  if (desc.includes('switch') || desc.includes('plug')) type = 'switch';
  else if (desc.includes('sensor')) type = 'sensor';
  else if (desc.includes('light') || desc.includes('bulb')) type = 'light';
  else if (desc.includes('thermostat')) type = 'thermostat';
  else if (desc.includes('curtain') || desc.includes('blind')) type = 'curtain';
  else if (desc.includes('lock')) type = 'lock';
  else if (desc.includes('button') || desc.includes('remote')) type = 'button';
  
  // Count gang if switch
  let gang = '';
  if (type === 'switch') {
    for (let i = 1; i <= 6; i++) {
      if (desc.includes(`${i} gang`) || desc.includes(`${i}-gang`)) {
        gang = `_${i}gang`;
        break;
      }
    }
  }
  
  return `${type}${gang}_${model.replace(/[^a-z0-9]/g, '_')}`;
}

/**
 * Determine device class
 */
function determineDeviceClass(device, capabilities) {
  const desc = (device.description || '').toLowerCase();
  const caps = capabilities.map(c => c.property);
  
  if (desc.includes('socket') || desc.includes('plug')) return 'socket';
  if (desc.includes('light') || desc.includes('bulb')) return 'light';
  if (desc.includes('switch')) return 'socket';
  if (desc.includes('sensor')) {
    if (caps.includes('occupancy')) return 'sensor';
    if (caps.includes('contact')) return 'sensor';
    if (caps.includes('temperature')) return 'sensor';
  }
  if (desc.includes('thermostat')) return 'thermostat';
  if (desc.includes('button') || desc.includes('remote')) return 'button';
  if (desc.includes('curtain') || desc.includes('blind')) return 'windowcoverings';
  if (desc.includes('lock')) return 'lock';
  if (desc.includes('siren')) return 'other';
  
  return 'other';
}

/**
 * Determine energy configuration
 */
function determineEnergy(device, capabilities) {
  const hasPower = capabilities.some(c => c.property === 'power');
  const hasEnergy = capabilities.some(c => c.property === 'energy');
  
  if (!hasPower && !hasEnergy) return null;
  
  const energy = {};
  
  if (capabilities.some(c => c.property === 'battery')) {
    energy.batteries = ['CR2450'];
  }
  
  if (hasPower || hasEnergy) {
    energy.approximation = {
      usageConstant: 1
    };
  }
  
  return energy;
}

/**
 * Extract endpoints from device
 */
function extractEndpoints(device) {
  const endpoints = {};
  
  // Most Tuya devices have endpoint 1 as main
  endpoints['1'] = {
    clusters: [0, 1, 3, 4, 5, 6], // Basic, PowerConfig, Identify, Groups, Scenes, OnOff
    bindings: [6, 1]
  };
  
  // Add more endpoints if multi-gang
  const desc = (device.description || '').toLowerCase();
  for (let i = 2; i <= 6; i++) {
    if (desc.includes(`${i} gang`) || desc.includes(`${i}-gang`)) {
      endpoints[i.toString()] = {
        clusters: [0, 4, 5, 6],
        bindings: [6]
      };
    }
  }
  
  return endpoints;
}

/**
 * Main extraction process
 */
async function main() {
  console.log('🚀 Starting extraction process...\n');
  
  // Step 1: Fetch Z2M devices
  const allDevices = await fetchZ2MDevices();
  
  if (allDevices.length === 0) {
    console.error('❌ No devices fetched');
    process.exit(1);
  }
  
  // Step 2: Filter Tuya devices
  const tuyaDevices = filterTuyaDevices(allDevices);
  console.log(`🔍 Found ${tuyaDevices.length} Tuya devices\n`);
  
  // Step 3: Process each device
  const extracted = [];
  const errors = [];
  
  for (let i = 0; i < Math.min(tuyaDevices.length, 50); i++) {
    const device = tuyaDevices[i];
    
    try {
      console.log(`📦 Processing: ${device.model} (${device.description})`);
      
      // Parse capabilities
      const capabilities = parseCapabilities(device.exposes);
      
      // Generate driver config
      const config = generateDriverConfig(device, capabilities);
      
      // Try to fetch converter for DataPoints
      const converter = await fetchZ2MConverter(device.model);
      if (converter) {
        config.datapoints = extractDataPoints(converter.content, device.model);
        console.log(`   ✓ Found ${config.datapoints.length} DataPoints`);
      }
      
      extracted.push(config);
      console.log(`   ✅ Extracted successfully\n`);
      
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
      errors.push({
        device: device.model,
        error: err.message
      });
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Step 4: Save results
  const outputPath = path.join(OUTPUT_DIR, 'zigbee2mqtt-extracted.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    generated: new Date().toISOString(),
    source: 'zigbee2mqtt',
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
    byClass: {},
    byVendor: {},
    capabilities: new Set(),
    datapoints: new Set()
  };
  
  extracted.forEach(device => {
    // By class
    summary.byClass[device.class] = (summary.byClass[device.class] || 0) + 1;
    
    // By vendor
    const vendor = device.metadata.vendor;
    summary.byVendor[vendor] = (summary.byVendor[vendor] || 0) + 1;
    
    // Capabilities
    device.capabilities.forEach(cap => summary.capabilities.add(cap));
    
    // DataPoints
    if (device.datapoints) {
      device.datapoints.forEach(dp => summary.datapoints.add(dp.dp));
    }
  });
  
  console.log('\n📊 SUMMARY:');
  console.log('  Device Classes:', Object.keys(summary.byClass).length);
  Object.entries(summary.byClass).forEach(([cls, count]) => {
    console.log(`    - ${cls}: ${count}`);
  });
  console.log(`  Unique Capabilities: ${summary.capabilities.size}`);
  console.log(`  Unique DataPoints: ${summary.datapoints.size}`);
  
  const summaryPath = path.join(OUTPUT_DIR, 'extraction-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    ...summary,
    capabilities: Array.from(summary.capabilities),
    datapoints: Array.from(summary.datapoints)
  }, null, 2));
  
  console.log(`\n📁 Summary: ${summaryPath}`);
}

// Run
main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
