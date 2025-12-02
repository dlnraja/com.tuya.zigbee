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
// Updated: 2025-12-02 - UNBRANDED driver names (no product numbers)
const DEVICE_PATTERNS = {
  // ============ SWITCHES ============
  switch_1gang: {
    patterns: ['TS0001', 'TS0011', '_TZ3000_.*switch'],
    keywords: ['switch', '1gang', '1-gang', 'relay', 'single'],
    class: 'socket'
  },
  switch_2gang: {
    patterns: ['TS0002', 'TS0012'],
    keywords: ['2gang', '2-gang', 'dual', 'double'],
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
  switch_wall_5gang: {
    patterns: ['TS0005', 'TS0015'],
    keywords: ['5gang', '5-gang'],
    class: 'socket'
  },
  switch_wall_6gang: {
    patterns: ['TS0006', 'TS0016'],
    keywords: ['6gang', '6-gang'],
    class: 'socket'
  },

  // ============ BUTTONS ============
  button_wireless_1: {
    patterns: ['TS0041'],
    keywords: ['1-button', '1button', 'single button'],
    class: 'button'
  },
  button_wireless_2: {
    patterns: ['TS0042'],
    keywords: ['2-button', '2button', 'dual button'],
    class: 'button'
  },
  button_wireless_3: {
    patterns: ['TS0043'],
    keywords: ['3-button', '3button', 'triple button'],
    class: 'button'
  },
  button_wireless_4: {
    patterns: ['TS0044'],
    keywords: ['4-button', '4button', 'quad button'],
    class: 'button'
  },

  // ============ PLUGS ============
  plug_smart: {
    patterns: ['TS011F', 'TS0121', 'S31ZB', '_TZ3000_.*plug'],
    keywords: ['plug', 'outlet', 'socket'],
    class: 'socket'
  },
  plug_energy_monitor: {
    patterns: ['TS011F.*energy', '_TZ3000_.*meter'],
    keywords: ['energy', 'power meter', 'monitoring'],
    class: 'socket'
  },

  // ============ SENSORS ============
  climate_sensor: {
    patterns: ['TS0201', '_TZ3000_.*temp', '_TZE200_.*temp'],
    keywords: ['temperature', 'humidity', 'climate', 'weather', 'thermo'],
    class: 'sensor'
  },
  contact_sensor: {
    patterns: ['TS0203', '_TZ3000_.*door', '_TZ3000_.*window'],
    keywords: ['door', 'window', 'contact', 'magnet', 'open', 'close'],
    class: 'sensor'
  },
  motion_sensor: {
    patterns: ['TS0202', '_TZ3000_.*motion', '_TZ3000_.*pir'],
    keywords: ['motion', 'pir', 'occupancy', 'movement'],
    class: 'sensor'
  },
  water_leak_sensor: {
    patterns: ['TS0207', '_TZ3000_.*water', '_TZ3000_.*leak'],
    keywords: ['water', 'leak', 'flood', 'moisture'],
    class: 'sensor'
  },
  smoke_detector_advanced: {
    patterns: ['TS0205', '_TZ3000_.*smoke'],
    keywords: ['smoke', 'fire'],
    class: 'sensor'
  },
  vibration_sensor: {
    patterns: ['TS0210', '_TZ3000_.*vibr'],
    keywords: ['vibration', 'shock'],
    class: 'sensor'
  },

  // ============ PRESENCE ============
  presence_sensor_radar: {
    patterns: ['_TZE200_.*presence', '_TZE204_.*presence', '_TZ3210_.*radar'],
    keywords: ['presence', 'radar', 'mmwave', 'human', 'occupancy'],
    class: 'sensor'
  },

  // ============ COVERS ============
  curtain_motor: {
    patterns: ['TS0601.*cover', '_TZE200_.*curtain', '_TZE200_.*blind', 'TS130F'],
    keywords: ['curtain', 'blind', 'shade', 'roller', 'cover', 'shutter'],
    class: 'windowcoverings'
  },
  shutter_roller_controller: {
    patterns: ['TS0302'],
    keywords: ['shutter', 'roller'],
    class: 'windowcoverings'
  },

  // ============ THERMOSTATS ============
  thermostat_tuya_dp: {
    patterns: ['_TZE200_.*thermo', '_TZE204_.*thermo', 'BHT-002', 'BRT-100', 'SEA801'],
    keywords: ['thermostat', 'heating', 'trv', 'radiator'],
    class: 'thermostat'
  },
  radiator_valve: {
    patterns: ['_TZE200_.*trv', '_TZE200_.*valve'],
    keywords: ['trv', 'radiator valve', 'heating valve'],
    class: 'thermostat'
  },

  // ============ DIMMERS ============
  dimmer_wall_1gang: {
    patterns: ['TS0101', 'TS110F', 'TS110E', '_TZ3000_.*dim'],
    keywords: ['dimmer', 'brightness'],
    class: 'light'
  },
  dimmer_dual_channel: {
    patterns: ['TS1101'],
    keywords: ['dual dimmer', '2ch dimmer', 'two channel'],
    class: 'light'
  },

  // ============ LIGHTS ============
  bulb_dimmable: {
    patterns: ['TS0501A', 'TS0501B'],
    keywords: ['dimmable bulb', 'white bulb'],
    class: 'light'
  },
  bulb_tunable_white: {
    patterns: ['TS0502A', 'TS0502B'],
    keywords: ['cct', 'color temperature', 'tunable white'],
    class: 'light'
  },
  bulb_rgb: {
    patterns: ['TS0503A', 'TS0503B', '_TZ3000_.*rgb'],
    keywords: ['rgb', 'color'],
    class: 'light'
  },
  bulb_rgbw: {
    patterns: ['TS0504A', 'TS0505A', 'TS0505B'],
    keywords: ['rgbw', 'rgbcct', 'full color'],
    class: 'light'
  },
  led_strip_rgbw: {
    patterns: ['TS0504B', '_TZ3000_.*strip'],
    keywords: ['led strip', 'strip light'],
    class: 'light'
  },

  // ============ AIR QUALITY ============
  air_quality_comprehensive: {
    patterns: ['_TZE200_.*co2', '_TZE200_.*air', '_TZE200_.*voc'],
    keywords: ['co2', 'air quality', 'voc', 'pm25', 'formaldehyde'],
    class: 'sensor'
  },

  // ============ VALVES ============
  valve_single: {
    patterns: ['_TZE200_.*valve'],
    keywords: ['valve', 'water valve', 'gas valve'],
    class: 'socket'
  },
  valve_irrigation: {
    patterns: ['_TZE200_.*irrigation'],
    keywords: ['irrigation', 'garden', 'sprinkler'],
    class: 'socket'
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
    // TS0601 devices need more context - default to thermostat if unsure
    return { driver: 'thermostat_tuya_dp', class: 'thermostat', confidence: 'fallback' };
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
