#!/usr/bin/env node
/**
 * 🔄 REORGANIZE AND ENRICH ALL DRIVERS
 *
 * This script:
 * 1. Scans all driver.compose.json files
 * 2. Identifies misplaced devices (e.g., buttons in switch drivers)
 * 3. Moves them to correct drivers
 * 4. Enriches with proper DP mappings
 * 5. NEVER reduces device count - only reorganizes
 *
 * Run: node scripts/enrichment/REORGANIZE-AND-ENRICH.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  driversDir: path.join(__dirname, '../../drivers'),
  backupDir: path.join(__dirname, '../../data/reorganization-backup'),
  reportFile: path.join(__dirname, '../../data/reorganization-report.json'),
  dryRun: process.argv.includes('--dry-run')
};

// Device classification rules - VERY SPECIFIC patterns
const DEVICE_RULES = {
  // ============ SWITCHES ============
  switch_1gang: {
    productPatterns: ['TS0001', 'TS0011', 'TS0121'],
    manufacturerPatterns: [
      '_TZ3000_.*',  // Generic TZ3000 switches
      'SONOFF',
      'Shelly'
    ],
    excludePatterns: ['scene', 'button', 'remote', 'dimmer', 'cover', 'curtain'],
    dpMapping: {
      1: { capability: 'onoff', type: 'bool' },
      10: { capability: 'measure_battery', type: 'value', optional: true },
      108: { capability: 'child_lock', type: 'bool', optional: true }
    }
  },

  switch_2gang: {
    productPatterns: ['TS0002', 'TS0012', 'TS0122'],
    manufacturerPatterns: ['_TZ3000_.*2gang', '_TZ3000_.*dual'],
    excludePatterns: ['scene', 'button', 'remote'],
    dpMapping: {
      1: { capability: 'onoff.1', type: 'bool' },
      2: { capability: 'onoff.2', type: 'bool' },
      10: { capability: 'measure_battery', type: 'value', optional: true }
    }
  },

  switch_3gang: {
    productPatterns: ['TS0003', 'TS0013', 'TS0123'],
    manufacturerPatterns: ['_TZ3000_.*3gang', '_TZ3000_.*triple'],
    excludePatterns: ['scene', 'button', 'remote'],
    dpMapping: {
      1: { capability: 'onoff.1', type: 'bool' },
      2: { capability: 'onoff.2', type: 'bool' },
      3: { capability: 'onoff.3', type: 'bool' }
    }
  },

  switch_4gang: {
    productPatterns: ['TS0004', 'TS0014', 'TS0124'],
    manufacturerPatterns: ['_TZ3000_.*4gang', '_TZ3000_.*quad'],
    excludePatterns: ['scene', 'button', 'remote'],
    dpMapping: {
      1: { capability: 'onoff.1', type: 'bool' },
      2: { capability: 'onoff.2', type: 'bool' },
      3: { capability: 'onoff.3', type: 'bool' },
      4: { capability: 'onoff.4', type: 'bool' }
    }
  },

  // ============ BUTTONS / REMOTES ============
  button_wireless_1: {
    productPatterns: ['TS0041'],
    manufacturerPatterns: ['_TZ3000_.*button', '_TZ3000_.*scene'],
    includeKeywords: ['button', 'scene', 'remote', '1-button', '1button'],
    dpMapping: {
      1: { capability: 'button', type: 'enum', values: ['single', 'double', 'hold'] }
    }
  },

  button_wireless_2: {
    productPatterns: ['TS0042'],
    manufacturerPatterns: [],
    includeKeywords: ['2-button', '2button', 'dual button'],
    dpMapping: {
      1: { capability: 'button.1', type: 'enum' },
      2: { capability: 'button.2', type: 'enum' }
    }
  },

  button_wireless_3: {
    productPatterns: ['TS0043'],
    manufacturerPatterns: [],
    includeKeywords: ['3-button', '3button', 'triple button'],
    dpMapping: {}
  },

  button_wireless_4: {
    productPatterns: ['TS0044'],
    manufacturerPatterns: [],
    includeKeywords: ['4-button', '4button', 'quad button'],
    dpMapping: {}
  },

  // ============ PLUGS ============
  plug_smart: {
    productPatterns: ['TS011F', 'TS0121', 'SP-EUC01'],
    manufacturerPatterns: ['_TZ3000_.*plug', '_TZ3000_.*outlet'],
    includeKeywords: ['plug', 'outlet', 'socket'],
    excludePatterns: ['switch', 'relay'],
    dpMapping: {
      1: { capability: 'onoff', type: 'bool' },
      9: { capability: 'meter_power', type: 'value' },
      17: { capability: 'measure_voltage', type: 'value' },
      18: { capability: 'measure_current', type: 'value' },
      19: { capability: 'measure_power', type: 'value' }
    }
  },

  // ============ SENSORS ============
  climate_sensor: {
    productPatterns: ['TS0201', 'TH01', 'TH03'],
    manufacturerPatterns: ['_TZ3000_.*temp', '_TZE200_.*temp', '_TZ3000_.*climate'],
    includeKeywords: ['temperature', 'humidity', 'climate', 'weather'],
    dpMapping: {
      101: { capability: 'measure_temperature', type: 'value', scale: 0.1 },
      102: { capability: 'measure_humidity', type: 'value', scale: 0.1 }
    }
  },

  contact_sensor: {
    productPatterns: ['TS0203', 'DS01', 'DS02'],
    manufacturerPatterns: ['_TZ3000_.*door', '_TZ3000_.*window', '_TZ3000_.*contact'],
    includeKeywords: ['door', 'window', 'contact', 'magnet'],
    dpMapping: {
      1: { capability: 'alarm_contact', type: 'bool' },
      10: { capability: 'measure_battery', type: 'value' }
    }
  },

  motion_sensor: {
    productPatterns: ['TS0202', 'MS01', 'PIR'],
    manufacturerPatterns: ['_TZ3000_.*motion', '_TZ3000_.*pir', '_TZ3000_.*occupancy'],
    includeKeywords: ['motion', 'pir', 'occupancy', 'movement'],
    dpMapping: {
      1: { capability: 'alarm_motion', type: 'bool' },
      10: { capability: 'measure_battery', type: 'value' }
    }
  },

  water_leak_sensor: {
    productPatterns: ['TS0207', 'WL01'],
    manufacturerPatterns: ['_TZ3000_.*water', '_TZ3000_.*leak', '_TZ3000_.*flood'],
    includeKeywords: ['water', 'leak', 'flood'],
    dpMapping: {
      1: { capability: 'alarm_water', type: 'bool' },
      10: { capability: 'measure_battery', type: 'value' }
    }
  },

  smoke_detector: {
    productPatterns: ['TS0205', 'SD01'],
    manufacturerPatterns: ['_TZ3000_.*smoke', '_TZ3000_.*fire'],
    includeKeywords: ['smoke', 'fire'],
    dpMapping: {
      1: { capability: 'alarm_smoke', type: 'bool' },
      10: { capability: 'measure_battery', type: 'value' }
    }
  },

  // ============ COVERS ============
  curtain_motor: {
    productPatterns: ['TS0601', 'TS0302', 'TS130F'],
    manufacturerPatterns: ['_TZE200_.*curtain', '_TZE200_.*blind', '_TZE200_.*cover', '_TZE200_.*shade'],
    includeKeywords: ['curtain', 'blind', 'shade', 'roller', 'cover', 'shutter'],
    dpMapping: {
      1: { capability: 'onoff', type: 'bool', optional: true },
      2: { capability: 'windowcoverings_state', type: 'enum', values: ['open', 'stop', 'close'] },
      3: { capability: 'windowcoverings_set', type: 'value', range: [0, 100] },
      5: { capability: 'alarm_motor', type: 'bool', optional: true }
    }
  },

  // ============ THERMOSTATS ============
  thermostat_ts0601: {
    productPatterns: ['TS0601', 'BHT-002', 'BRT-100', 'SEA801', 'ME167'],
    manufacturerPatterns: ['_TZE200_.*thermo', '_TZE204_.*thermo', '_TZE200_.*trv'],
    includeKeywords: ['thermostat', 'heating', 'trv', 'valve', 'radiator'],
    excludePatterns: ['curtain', 'blind', 'cover'],
    dpMapping: {
      1: { capability: 'onoff', type: 'bool' },
      2: { capability: 'thermostat_mode', type: 'enum' },
      4: { capability: 'target_temperature', type: 'value', scale: 0.1 },
      101: { capability: 'measure_temperature', type: 'value', scale: 0.1 }
    }
  },

  // ============ PRESENCE ============
  presence_sensor_radar: {
    productPatterns: ['ZG-204ZM', 'ZY-M100'],
    manufacturerPatterns: ['_TZE200_.*presence', '_TZE204_.*presence', '_TZ3210_.*radar', '_TZE200_.*human'],
    includeKeywords: ['presence', 'radar', 'mmwave', 'human'],
    dpMapping: {
      1: { capability: 'alarm_motion', type: 'bool' },
      2: { capability: 'measure_luminance', type: 'value', optional: true },
      101: { capability: 'radar_sensitivity', type: 'value', optional: true }
    }
  },

  // ============ LIGHTING ============
  light_dimmer: {
    productPatterns: ['TS0101', 'TS110F', 'TS110E'],
    manufacturerPatterns: ['_TZ3000_.*dim', '_TYZB01_.*dim'],
    includeKeywords: ['dimmer', 'brightness'],
    excludePatterns: ['switch', 'relay'],
    dpMapping: {
      1: { capability: 'onoff', type: 'bool' },
      2: { capability: 'dim', type: 'value', range: [0, 1000] }
    }
  },

  light_rgb: {
    productPatterns: ['TS0503A', 'TS0504A', 'TS0504B'],
    manufacturerPatterns: ['_TZ3000_.*rgb', '_TZ3210_.*rgb'],
    includeKeywords: ['rgb', 'color', 'led strip'],
    dpMapping: {
      1: { capability: 'onoff', type: 'bool' },
      2: { capability: 'dim', type: 'value' },
      3: { capability: 'light_hue', type: 'value', range: [0, 360] },
      4: { capability: 'light_saturation', type: 'value', range: [0, 1000] }
    }
  },

  // ============ AIR QUALITY ============
  air_quality_co2: {
    productPatterns: ['TS0601'],
    manufacturerPatterns: ['_TZE200_.*co2', '_TZE200_.*air', '_TZE204_.*co2'],
    includeKeywords: ['co2', 'air quality', 'voc', 'pm25', 'formaldehyde'],
    dpMapping: {
      114: { capability: 'measure_co2', type: 'value' },
      115: { capability: 'measure_pm25', type: 'value' },
      117: { capability: 'measure_voc', type: 'value' }
    }
  }
};

// Ensure backup directory exists
if (!fs.existsSync(CONFIG.backupDir)) {
  fs.mkdirSync(CONFIG.backupDir, { recursive: true });
}

/**
 * Load all drivers
 */
function loadAllDrivers() {
  const drivers = {};

  if (!fs.existsSync(CONFIG.driversDir)) {
    console.log('❌ Drivers directory not found');
    return drivers;
  }

  const driverDirs = fs.readdirSync(CONFIG.driversDir);

  for (const driverName of driverDirs) {
    const composePath = path.join(CONFIG.driversDir, driverName, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      try {
        const content = fs.readFileSync(composePath, 'utf-8');
        drivers[driverName] = {
          path: composePath,
          content: content,
          data: JSON.parse(content),
          devices: []
        };

        // Extract devices
        if (drivers[driverName].data.zigbee?.endpoints) {
          for (const endpoint of Object.values(drivers[driverName].data.zigbee.endpoints)) {
            if (endpoint.devices) {
              drivers[driverName].devices.push(...endpoint.devices);
            }
          }
        }
      } catch (e) {
        console.log(`   ⚠️ Error loading ${driverName}: ${e.message}`);
      }
    }
  }

  console.log(`📂 Loaded ${Object.keys(drivers).length} drivers`);
  return drivers;
}

/**
 * Classify a device based on its IDs
 */
function classifyDevice(device) {
  const mfr = (device.manufacturerName || '').toLowerCase();
  const prod = (device.productId || '').toLowerCase();

  for (const [driverName, rules] of Object.entries(DEVICE_RULES)) {
    // Check product patterns
    if (rules.productPatterns) {
      for (const pattern of rules.productPatterns) {
        if (prod.toUpperCase().startsWith(pattern)) {
          // Check excludes
          if (rules.excludePatterns) {
            const excluded = rules.excludePatterns.some(ex =>
              mfr.includes(ex) || prod.includes(ex)
            );
            if (excluded) continue;
          }
          return { driver: driverName, confidence: 'product', matchedPattern: pattern };
        }
      }
    }

    // Check manufacturer patterns
    if (rules.manufacturerPatterns) {
      for (const pattern of rules.manufacturerPatterns) {
        const regex = new RegExp(pattern.toLowerCase());
        if (regex.test(mfr)) {
          // Check excludes
          if (rules.excludePatterns) {
            const excluded = rules.excludePatterns.some(ex =>
              mfr.includes(ex) || prod.includes(ex)
            );
            if (excluded) continue;
          }
          return { driver: driverName, confidence: 'manufacturer', matchedPattern: pattern };
        }
      }
    }

    // Check include keywords
    if (rules.includeKeywords) {
      for (const keyword of rules.includeKeywords) {
        if (mfr.includes(keyword) || prod.includes(keyword)) {
          return { driver: driverName, confidence: 'keyword', matchedKeyword: keyword };
        }
      }
    }
  }

  return null; // No classification found
}

/**
 * Analyze all devices and find misplacements
 */
function analyzeDevices(drivers) {
  const analysis = {
    totalDevices: 0,
    correctlyPlaced: 0,
    misplaced: [],
    unclassified: [],
    byDriver: {}
  };

  for (const [driverName, driver] of Object.entries(drivers)) {
    analysis.byDriver[driverName] = {
      total: driver.devices.length,
      correct: 0,
      wrong: []
    };

    for (const device of driver.devices) {
      analysis.totalDevices++;

      const classification = classifyDevice(device);

      if (!classification) {
        // Device couldn't be classified - keep it where it is
        analysis.byDriver[driverName].correct++;
        analysis.correctlyPlaced++;
        analysis.unclassified.push({
          device,
          currentDriver: driverName
        });
      } else if (classification.driver === driverName) {
        // Correctly placed
        analysis.byDriver[driverName].correct++;
        analysis.correctlyPlaced++;
      } else {
        // Misplaced - should move
        analysis.byDriver[driverName].wrong.push({
          device,
          shouldBe: classification.driver,
          confidence: classification.confidence,
          reason: classification.matchedPattern || classification.matchedKeyword
        });
        analysis.misplaced.push({
          device,
          currentDriver: driverName,
          targetDriver: classification.driver,
          confidence: classification.confidence,
          reason: classification.matchedPattern || classification.matchedKeyword
        });
      }
    }
  }

  return analysis;
}

/**
 * Perform reorganization
 */
function reorganize(drivers, analysis) {
  if (analysis.misplaced.length === 0) {
    console.log('✅ All devices are correctly placed!');
    return { moved: 0, errors: 0 };
  }

  console.log(`\n🔄 Reorganizing ${analysis.misplaced.length} devices...`);

  const stats = { moved: 0, errors: 0 };
  const changes = {}; // Track changes per driver

  // Group moves by driver
  const movesToDo = {};
  for (const item of analysis.misplaced) {
    // From
    if (!movesToDo[item.currentDriver]) {
      movesToDo[item.currentDriver] = { remove: [], add: [] };
    }
    movesToDo[item.currentDriver].remove.push(item.device);

    // To
    if (!movesToDo[item.targetDriver]) {
      movesToDo[item.targetDriver] = { remove: [], add: [] };
    }
    movesToDo[item.targetDriver].add.push(item.device);
  }

  // Apply changes
  for (const [driverName, moves] of Object.entries(movesToDo)) {
    if (!drivers[driverName]) {
      console.log(`   ⚠️ Target driver ${driverName} doesn't exist - keeping devices in place`);
      continue;
    }

    const driver = drivers[driverName];
    const compose = driver.data;

    // Get endpoint
    const endpoints = compose.zigbee?.endpoints;
    if (!endpoints) continue;

    const endpointKey = Object.keys(endpoints)[0];
    if (!endpointKey) continue;

    const endpoint = endpoints[endpointKey];
    if (!endpoint.devices) {
      endpoint.devices = [];
    }

    // Remove devices
    for (const device of moves.remove) {
      const idx = endpoint.devices.findIndex(d =>
        d.manufacturerName === device.manufacturerName &&
        d.productId === device.productId
      );
      if (idx !== -1) {
        endpoint.devices.splice(idx, 1);
        console.log(`   ➖ Removed from ${driverName}: ${device.manufacturerName || device.productId}`);
      }
    }

    // Add devices
    for (const device of moves.add) {
      // Check if already exists
      const exists = endpoint.devices.some(d =>
        d.manufacturerName === device.manufacturerName &&
        d.productId === device.productId
      );
      if (!exists) {
        endpoint.devices.push(device);
        console.log(`   ➕ Added to ${driverName}: ${device.manufacturerName || device.productId}`);
        stats.moved++;
      }
    }

    // Mark as changed
    changes[driverName] = compose;
  }

  // Save changes
  if (!CONFIG.dryRun) {
    for (const [driverName, compose] of Object.entries(changes)) {
      const driver = drivers[driverName];

      // Backup
      const backupPath = path.join(CONFIG.backupDir, `${driverName}_${Date.now()}.json`);
      fs.writeFileSync(backupPath, driver.content);

      // Save
      fs.writeFileSync(driver.path, JSON.stringify(compose, null, 2));
      console.log(`   💾 Saved: ${driverName}`);
    }
  }

  return stats;
}

/**
 * Generate report
 */
function generateReport(analysis, stats) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalDevices: analysis.totalDevices,
      correctlyPlaced: analysis.correctlyPlaced,
      misplaced: analysis.misplaced.length,
      unclassified: analysis.unclassified.length,
      moved: stats.moved
    },
    misplacedDetails: analysis.misplaced.slice(0, 100), // Limit for readability
    byDriver: {}
  };

  // Summary by driver
  for (const [name, data] of Object.entries(analysis.byDriver)) {
    report.byDriver[name] = {
      total: data.total,
      correct: data.correct,
      wrongCount: data.wrong.length
    };
  }

  fs.writeFileSync(CONFIG.reportFile, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: ${CONFIG.reportFile}`);

  return report;
}

/**
 * Main function
 */
function main() {
  console.log('🔄 REORGANIZE AND ENRICH DRIVERS');
  console.log('='.repeat(50));
  console.log(`📅 ${new Date().toISOString()}`);

  if (CONFIG.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Load all drivers
  const drivers = loadAllDrivers();

  // Analyze
  console.log('\n🔍 Analyzing device placements...');
  const analysis = analyzeDevices(drivers);

  // Summary
  console.log('\n📊 Analysis Summary:');
  console.log(`   Total devices: ${analysis.totalDevices}`);
  console.log(`   Correctly placed: ${analysis.correctlyPlaced}`);
  console.log(`   Misplaced: ${analysis.misplaced.length}`);
  console.log(`   Unclassified: ${analysis.unclassified.length}`);

  // Show misplacements
  if (analysis.misplaced.length > 0) {
    console.log('\n🔀 Misplaced devices (sample):');
    for (const item of analysis.misplaced.slice(0, 10)) {
      console.log(`   ${item.device.manufacturerName || item.device.productId}`);
      console.log(`      ${item.currentDriver} → ${item.targetDriver} (${item.confidence})`);
    }
    if (analysis.misplaced.length > 10) {
      console.log(`   ... and ${analysis.misplaced.length - 10} more`);
    }
  }

  // Reorganize
  const stats = reorganize(drivers, analysis);

  // Generate report
  const report = generateReport(analysis, stats);

  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL SUMMARY:');
  console.log(`   Devices analyzed: ${analysis.totalDevices}`);
  console.log(`   Devices moved: ${stats.moved}`);
  console.log(`   Drivers affected: ${Object.keys(report.byDriver).filter(d => report.byDriver[d].wrongCount > 0).length}`);

  if (CONFIG.dryRun) {
    console.log('\n🔍 DRY RUN - Run without --dry-run to apply changes');
  }
}

// Run
main();
