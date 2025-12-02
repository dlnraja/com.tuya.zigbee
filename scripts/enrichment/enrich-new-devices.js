#!/usr/bin/env node
/**
 * 🧬 Enrich New Devices
 *
 * Takes discovered devices from auto-discover-devices.js
 * and enriches them with:
 * - Device type classification
 * - DP pattern matching
 * - Driver assignment
 * - Capability mapping
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  discoveryDir: path.join(__dirname, '../../data/discovery'),
  patternsFile: path.join(__dirname, '../../data/dp-patterns.json'),
  outputFile: path.join(__dirname, '../../data/discovery/enriched-devices.json')
};

// Device type detection patterns
const DEVICE_PATTERNS = {
  // Switches
  switch_1gang: {
    patterns: ['TS0001', 'TS0011', '_TZ3000_.*switch', '_TZE200_.*switch'],
    keywords: ['switch', '1gang', '1-gang', 'relay'],
    class: 'socket'
  },
  switch_2gang: {
    patterns: ['TS0002', 'TS0012', '_TZ3000_.*2gang'],
    keywords: ['2gang', '2-gang', 'dual'],
    class: 'socket'
  },
  switch_3gang: {
    patterns: ['TS0003', 'TS0013'],
    keywords: ['3gang', '3-gang', 'triple'],
    class: 'socket'
  },
  switch_4gang: {
    patterns: ['TS0004', 'TS0014'],
    keywords: ['4gang', '4-gang', 'quad'],
    class: 'socket'
  },

  // Plugs
  plug_smart: {
    patterns: ['TS011F', 'TS0121', '_TZ3000_.*plug'],
    keywords: ['plug', 'outlet', 'socket'],
    class: 'socket'
  },

  // Sensors
  climate_sensor: {
    patterns: ['TS0201', '_TZ3000_.*temp', '_TZE200_.*temp'],
    keywords: ['temperature', 'humidity', 'climate', 'weather'],
    class: 'sensor'
  },
  contact_sensor: {
    patterns: ['TS0203', '_TZ3000_.*door', '_TZ3000_.*window'],
    keywords: ['door', 'window', 'contact', 'magnet'],
    class: 'sensor'
  },
  motion_sensor: {
    patterns: ['TS0202', '_TZ3000_.*motion', '_TZ3000_.*pir'],
    keywords: ['motion', 'pir', 'occupancy'],
    class: 'sensor'
  },
  water_leak_sensor: {
    patterns: ['TS0207', '_TZ3000_.*water', '_TZ3000_.*leak'],
    keywords: ['water', 'leak', 'flood'],
    class: 'sensor'
  },
  smoke_detector: {
    patterns: ['TS0205', '_TZ3000_.*smoke'],
    keywords: ['smoke', 'fire'],
    class: 'sensor'
  },

  // Presence
  presence_sensor_radar: {
    patterns: ['_TZE200_.*presence', '_TZE204_.*presence', '_TZ3210_.*radar'],
    keywords: ['presence', 'radar', 'mmwave', 'human'],
    class: 'sensor'
  },

  // Curtains
  curtain_motor: {
    patterns: ['TS0601.*cover', '_TZE200_.*curtain', '_TZE200_.*blind'],
    keywords: ['curtain', 'blind', 'shade', 'roller', 'cover'],
    class: 'windowcoverings'
  },

  // Thermostats
  thermostat_ts0601: {
    patterns: ['_TZE200_.*thermo', '_TZE204_.*thermo', 'BHT-002', 'BRT-100'],
    keywords: ['thermostat', 'heating', 'trv', 'valve'],
    class: 'thermostat'
  },

  // Lighting
  light_dimmer: {
    patterns: ['TS0101', 'TS110F', '_TZ3000_.*dim'],
    keywords: ['dimmer', 'brightness'],
    class: 'light'
  },
  light_rgb: {
    patterns: ['TS0503', 'TS0504', '_TZ3000_.*rgb'],
    keywords: ['rgb', 'color', 'led strip'],
    class: 'light'
  },
  light_cct: {
    patterns: ['TS0502', '_TZ3000_.*cct'],
    keywords: ['cct', 'color temperature', 'white'],
    class: 'light'
  },

  // Buttons
  button_wireless: {
    patterns: ['TS0041', 'TS0042', 'TS0043', 'TS0044'],
    keywords: ['button', 'remote', 'scene'],
    class: 'button'
  },

  // Air Quality
  air_quality_co2: {
    patterns: ['_TZE200_.*co2', '_TZE200_.*air'],
    keywords: ['co2', 'air quality', 'voc', 'pm25'],
    class: 'sensor'
  }
};

/**
 * Load discovered devices
 */
function loadDiscoveredDevices() {
  const filePath = path.join(CONFIG.discoveryDir, 'new-devices.json');

  if (!fs.existsSync(filePath)) {
    console.log('⚠️ No discovered devices file found');
    return [];
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return data.devices || [];
}

/**
 * Classify device type based on ID and keywords
 */
function classifyDevice(device) {
  const id = device.id.toLowerCase();
  const file = (device.file || '').toLowerCase();

  for (const [driverName, config] of Object.entries(DEVICE_PATTERNS)) {
    // Check patterns
    for (const pattern of config.patterns) {
      const regex = new RegExp(pattern.toLowerCase());
      if (regex.test(id)) {
        return {
          driver: driverName,
          class: config.class,
          confidence: 'pattern',
          matchedPattern: pattern
        };
      }
    }

    // Check keywords in file name
    for (const keyword of config.keywords) {
      if (file.includes(keyword.toLowerCase())) {
        return {
          driver: driverName,
          class: config.class,
          confidence: 'keyword',
          matchedKeyword: keyword
        };
      }
    }
  }

  // Default classification based on prefix
  if (id.startsWith('ts0001') || id.startsWith('ts0011')) {
    return { driver: 'switch_1gang', class: 'socket', confidence: 'prefix' };
  }
  if (id.startsWith('ts011f') || id.startsWith('ts0121')) {
    return { driver: 'plug_smart', class: 'socket', confidence: 'prefix' };
  }
  if (id.startsWith('ts0201')) {
    return { driver: 'climate_sensor', class: 'sensor', confidence: 'prefix' };
  }
  if (id.startsWith('ts0601') || id.startsWith('_tze')) {
    // TS0601 devices need more context - default to climate if unsure
    return { driver: 'thermostat_ts0601', class: 'thermostat', confidence: 'fallback' };
  }

  // Unknown
  return { driver: 'unknown', class: 'other', confidence: 'none' };
}

/**
 * Enrich device with DP patterns
 */
function enrichWithDPPatterns(device, classification) {
  // Load DP patterns if available
  if (fs.existsSync(CONFIG.patternsFile)) {
    try {
      const patterns = JSON.parse(fs.readFileSync(CONFIG.patternsFile, 'utf-8'));

      // Get relevant domain
      const domainMap = {
        'socket': 'common_universal',
        'sensor': 'climate',
        'thermostat': 'thermostat',
        'windowcoverings': 'cover',
        'light': 'lighting'
      };

      const domain = domainMap[classification.class] || 'common_universal';

      if (patterns.domains && patterns.domains[domain]) {
        return {
          suggestedDPs: patterns.domains[domain].patterns.slice(0, 5).map(p => ({
            dp: p.dp,
            name: p.name,
            capability: p.homeyCapabilities?.[0]
          }))
        };
      }
    } catch (e) {
      // Ignore pattern loading errors
    }
  }

  return { suggestedDPs: [] };
}

/**
 * Main enrichment function
 */
function enrich() {
  console.log('🧬 Enriching Discovered Devices');
  console.log('='.repeat(50));

  // Load devices
  const devices = loadDiscoveredDevices();
  console.log(`📋 Loaded ${devices.length} devices to enrich`);

  if (devices.length === 0) {
    console.log('ℹ️ No devices to enrich');
    return;
  }

  // Enrich each device
  const enrichedDevices = [];
  const stats = {
    byDriver: {},
    byConfidence: { pattern: 0, keyword: 0, prefix: 0, fallback: 0, none: 0 }
  };

  for (const device of devices) {
    // Classify
    const classification = classifyDevice(device);

    // Enrich with DPs
    const dpInfo = enrichWithDPPatterns(device, classification);

    // Build enriched record
    const enriched = {
      ...device,
      classification,
      ...dpInfo
    };

    enrichedDevices.push(enriched);

    // Stats
    if (!stats.byDriver[classification.driver]) {
      stats.byDriver[classification.driver] = 0;
    }
    stats.byDriver[classification.driver]++;
    stats.byConfidence[classification.confidence]++;
  }

  // Summary
  console.log('\n📊 Classification Summary:');
  console.log('\nBy Driver:');
  for (const [driver, count] of Object.entries(stats.byDriver).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${driver}: ${count}`);
  }

  console.log('\nBy Confidence:');
  for (const [conf, count] of Object.entries(stats.byConfidence)) {
    if (count > 0) {
      console.log(`   ${conf}: ${count}`);
    }
  }

  // Save enriched data
  const output = {
    _meta: {
      generated: new Date().toISOString(),
      totalDevices: enrichedDevices.length,
      stats
    },
    devices: enrichedDevices
  };

  fs.writeFileSync(CONFIG.outputFile, JSON.stringify(output, null, 2));
  console.log(`\n💾 Saved enriched devices to: ${CONFIG.outputFile}`);

  return enrichedDevices;
}

// Run
enrich();
